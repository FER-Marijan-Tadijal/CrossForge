import { notFound } from 'next/navigation';
import { prisma } from '@/prisma';
import CrosswordPage from '@/app/creator/creatorApp';
import { auth } from '@/auth';
import { SignIn } from '@/app/components/sign-in';

export default async function CreatorPage({ params, }: { params: Promise<{id: string}> }) {
  const session = await auth();
  const { id } = await params
  const crossword = await prisma.crossword.findUnique({
    where: { id: parseInt(id) },
  });

  if (!crossword) return notFound();

  if (!session || !session.user) return (
  <>
    <h1>Please sign in to create crosswords!</h1>
    <SignIn />
  </>)

  if (crossword.creatorId != session?.user.id) return (
  <>
    <h1>You are not allowed to edit this crossword.</h1>
    <SignIn />
  </>)

  return (
    <CrosswordPage
      id = {crossword.id}
      initialGrid={(crossword.grid as any).grid}
      initialBlacklist={(crossword.grid as any).blacklist}
    />
  );
}
