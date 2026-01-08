export interface Example {
  label: string
  prompt: string
}

export const EXAMPLES: readonly Example[] = [
  {
    label: "User Login Flow",
    prompt: "Create a flowchart for a user login process with OAuth and email options",
  },
  {
    label: "API Sequence",
    prompt:
      "Generate a sequence diagram showing how a frontend app authenticates with a backend API",
  },
  {
    label: "Project Timeline",
    prompt: "Show me a Gantt chart for a 2-week software release cycle",
  },
  {
    label: "E-commerce Model",
    prompt: "Draw a class diagram for a basic E-commerce system with Orders, Products and Users",
  },
] as const
