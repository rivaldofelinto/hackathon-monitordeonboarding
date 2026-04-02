import { UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Monitor de Onboarding</h1>
        <p className="text-xl text-gray-600 mb-8">
          Monitoramento agregado de 7 pipelines Pipefy paralelos
        </p>
        <UserButton afterSignOutUrl="/" />
      </div>
    </main>
  )
}
