export default function TestPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Test Page</h1>
      <p>ID: {params.id}</p>
    </div>
  )
}

