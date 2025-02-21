---
description: add jsdoc comments to components and methods
globs: *.tsx, *.ts
---
# JSDoc Documentation Standards

<rule>
name: component_documentation
description: Standards for documenting React components and methods
filters:
  - type: file_extension
    pattern: "\\.(ts|tsx)$"
  - type: content
    pattern: "(function|const).*=.*\\(.*\\).*=>"

actions:
  - type: suggest
    message: |
      When documenting components and methods:

      1. **Component Documentation**
         ```typescript
         /**
          * A brief description of the component's purpose
          * 
          * @param props - Component props
          * @param props.prop1 - Description of prop1
          * @param props.prop2 - Description of prop2

          * @returns - React component
          *
          * @example
          * ```tsx
          * <MyComponent prop1="value" prop2={42} />
          * ```
          */
         ```

      2. **Utility Function Documentation**
         ```typescript
         /**
          * Brief description of the function's purpose
          * 
          * @param param1 - Description of param1
          * @param param2 - Description of param2
          *
          * @returns Description of return value
          * 
          * @throws Description of potential errors
          */
         ```

      3. **Hook Documentation**
         ```typescript
         /**
          * Brief description of the hook's purpose
          * 
          * @param param1 - Description of param1
          * @param param2 - Description of param2
          * 
          * @returns Description of return value
          *
          * @example
          * ```tsx
          * const result = useMyHook(param1, param2);
          * ```
          */
         ```

metadata:
  priority: high
  version: 1.0
</rule>