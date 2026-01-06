import { Button } from "@workspace/ui/components/button"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <main className="flex flex-col items-center gap-8 px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Next.js Monorepo Starter
          </h1>
          <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            Build fast with Turborepo, Next.js, shadcn/ui, Biome, and Knip.
          </p>
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <a
              href="https://turbo.build/repo/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Turborepo Docs
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://ui.shadcn.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              shadcn/ui
            </a>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            title="Turborepo"
            description="High-performance build system for JavaScript and TypeScript codebases."
          />
          <FeatureCard
            title="Biome"
            description="Fast formatter and linter, replacing ESLint and Prettier."
          />
          <FeatureCard
            title="Knip"
            description="Find unused files, dependencies and exports in your project."
          />
        </div>
      </main>
    </div>
  )
}

function FeatureCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  )
}
