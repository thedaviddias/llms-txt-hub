"""Exercise the exact inline publisher with synthetic credentials and mocked GitHub."""

import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

WORKFLOW = Path('.github/workflows/update-websites-json.yml').read_text()
INLINE = WORKFLOW.split("          python3 -I - <<'PY'\n", 1)[1].split('\n          PY', 1)[0]
SOURCE = '\n'.join(line[10:] if line.startswith('          ') else line for line in INLINE.splitlines())
PATHS = ('data/websites.json', 'apps/web/public/search/search-index.json')


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.requests = []
        self.head = 'source'
        self.tree = 'generated-tree'
        self.reject_ref = False
        for path in PATHS:
            file = self.root / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(json.dumps([{'name': 'Control', 'content': '$(touch /tmp/unsafe)'}]))

    def request(self, request, timeout):
        self.assertEqual(timeout, 30)
        self.assertTrue(request.full_url.startswith('https://api.github.com/repos/owner/repo/'))
        self.assertEqual(request.get_header('Authorization'), 'Bearer synthetic-token')
        body = json.loads(request.data) if request.data else None
        self.requests.append((request.method, request.full_url.split('/owner/repo')[1], body))
        if request.method == 'GET' and request.full_url.endswith('/git/ref/heads/main'):
            result = {'object': {'sha': self.head}}
        elif request.method == 'GET':
            result = {'tree': {'sha': 'base-tree'}}
        elif request.full_url.endswith('/git/trees'):
            result = {'sha': self.tree}
        elif request.full_url.endswith('/git/commits'):
            result = {'sha': 'commit'}
        elif request.method == 'PATCH':
            if self.reject_ref:
                raise urllib.error.HTTPError(request.full_url, 422, 'Concurrent update', {}, None)
            result = {'object': {'sha': 'commit'}}
        else:
            self.fail('Unexpected API operation')
        return io.BytesIO(json.dumps(result).encode())

    def execute(self):
        env = {'ARTIFACT_ROOT': str(self.root), 'PUBLICATION_TOKEN': 'synthetic-token',
               'SOURCE_SHA': 'source', 'TARGET_REPOSITORY': 'owner/repo'}
        with patch.dict(os.environ, env), patch('urllib.request.OpenerDirector.open', side_effect=self.request):
            exec(compile(SOURCE, '<workflow-publisher>', 'exec'), {})

    def assert_rejected(self):
        with self.assertRaises(SystemExit):
            self.execute()
        self.assertEqual(self.requests, [])

    def test_generation_has_no_write_secret_or_persisted_credentials(self):
        generation, publication = WORKFLOW.split('  publish:', 1)
        self.assertNotIn('secrets.', generation)
        self.assertIn('persist-credentials: false', generation)
        self.assertIn('contents: read', generation)
        self.assertIn('ref: ${{ github.sha }}', generation)
        for forbidden in ('actions/checkout', 'pnpm ', './scripts/', './.github/actions/'):
            self.assertNotIn(forbidden, publication)
        self.assertIn('python3 -I -', publication)

    def test_valid_json_publishes_only_allowed_regular_files(self):
        self.execute()
        tree_request = self.requests[2][2]
        self.assertEqual(tree_request['base_tree'], 'base-tree')
        self.assertEqual([entry['path'] for entry in tree_request['tree']], list(PATHS))
        for entry in tree_request['tree']:
            self.assertEqual((entry['mode'], entry['type']), ('100644', 'blob'))
            self.assertEqual(json.loads(entry['content'])[0]['name'], 'Control')
        self.assertEqual(self.requests[3][2]['parents'], ['source'])
        self.assertEqual(self.requests[4], ('PATCH', '/git/refs/heads/main', {'sha': 'commit', 'force': False}))

    def test_unchanged_data_creates_no_commit_or_ref_update(self):
        self.tree = 'base-tree'
        self.execute()
        self.assertEqual(len(self.requests), 3)

    def test_existing_generated_data_is_preserved_byte_for_byte(self):
        for path in PATHS:
            (self.root / path).write_bytes(Path(path).read_bytes())
        self.execute()
        for entry in self.requests[2][2]['tree']:
            self.assertEqual(entry['content'], Path(entry['path']).read_text())

    def test_advanced_main_performs_no_writes(self):
        self.head = 'new-source'
        with self.assertRaisesRegex(SystemExit, 'Main advanced'):
            self.execute()
        self.assertEqual(len(self.requests), 1)

    def test_concurrent_ref_update_is_not_forced_or_retried(self):
        self.reject_ref = True
        with self.assertRaisesRegex(SystemExit, 'HTTP 422'):
            self.execute()
        self.assertEqual(len(self.requests), 5)
        self.assertFalse(self.requests[-1][2]['force'])

    def test_unexpected_script_is_rejected_before_authentication(self):
        (self.root / 'payload.py').write_text('raise RuntimeError("executed")')
        self.assert_rejected()

    def test_symlink_file_is_rejected(self):
        file = self.root / PATHS[0]
        file.unlink()
        file.symlink_to(self.root / PATHS[1])
        self.assert_rejected()

    def test_symlink_parent_is_rejected(self):
        (self.root / PATHS[0]).unlink()
        (self.root / 'data').rmdir()
        (self.root / 'data').symlink_to(self.root / 'apps', target_is_directory=True)
        self.assert_rejected()

    def test_missing_file_is_rejected(self):
        (self.root / PATHS[0]).unlink()
        self.assert_rejected()

    def test_invalid_json_is_rejected(self):
        (self.root / PATHS[0]).write_text('malicious non-JSON payload')
        self.assert_rejected()

    def test_non_array_and_non_object_rows_are_rejected(self):
        for value in ({'path': '.github/workflows/attack.yml'}, ['bad'], [None]):
            with self.subTest(value=value):
                (self.root / PATHS[0]).write_text(json.dumps(value))
                self.assert_rejected()

    def test_nonstandard_json_constants_are_rejected(self):
        for value in ('NaN', 'Infinity', '-Infinity'):
            with self.subTest(value=value):
                (self.root / PATHS[0]).write_text('[{"value": ' + value + '}]')
                self.assert_rejected()

    def test_oversized_file_is_rejected(self):
        with (self.root / PATHS[0]).open('wb') as file:
            file.truncate(32 * 1024 * 1024 + 1)
        self.assert_rejected()


if __name__ == '__main__':
    unittest.main()
