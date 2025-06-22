import { auth } from "@/auth"
import { SignIn } from "@/app/components/sign-in";
import { SignOut } from "@/app/components/sign-out";

import { redirect } from 'next/navigation'
import { prisma } from '@/prisma'

const defaultEmptyGrid = Array.from({ length: 5 }, () =>
  Array.from({ length: 5 }, () => ({
    isBlack: false,
    letter: '',
    hasAcrossClue: false,
    hasDownClue: false,
    clueNo: null,
    horizontalClue: "",
    verticalClue: "",
    isAutofillZone: false,
  }))
);

const defaultGridWrapper = {grid: defaultEmptyGrid, blacklist: ""}

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <h1 className="text-4xl font-bold mb-4 text-center">Welcome to CrossForge</h1>
        <SignIn />
      </main>
    );
  }

  async function createNewCrossword(formData: FormData) {
    'use server'

    if (!session) return
    if (!session.user) return

    const aggr = await prisma.crossword.aggregate({
      _max: {
        id: true,
      }
    })
    const newId = (aggr._max.id ?? 0) + 1;
    console.log(newId)

    const creator = await prisma.crossword.create({
      data: {
        id: newId,
        createTime: new Date(),
        creatorId: session.user.id ?? "Error",
        grid: defaultGridWrapper,
      },
    })

    // Redirect to the new creator's page
    redirect(`/creator/${creator.id}`)
  }

  const userCrosswords = await prisma.crossword.findMany({
    where: {
      creatorId: session.user?.id,
    },
    orderBy: {
      createTime: 'desc',
    },
    select: {
      id: true,
      createTime: true,
      publishTime: true,
    },
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-4xl font-bold mb-4 text-center">Welcome to CrossForge</h1>
      <p>{session?.user?.name}</p>
      <SignOut />
      <form action={createNewCrossword}>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create New Crossword
        </button>
      </form>

      <section className="w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-2">Your Crosswords</h2>
        {userCrosswords.length === 0 ? (
          <p className="text-gray-600">You haven’t created any crosswords yet.</p>
        ) : (
          <ul className="space-y-2">
            {userCrosswords.map(cw => (
              <li key={cw.id} className="border p-3 rounded bg-white shadow">
                <a href={`/creator/${cw.id}`} className="text-blue-700 font-medium hover:underline">
                  Crossword #{cw.id}
                </a>
                <div className="text-sm text-gray-500">
                  Created: {cw.createTime.toLocaleString()}
                  {cw.publishTime && <> • Published: {cw.publishTime.toLocaleString()}</>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
