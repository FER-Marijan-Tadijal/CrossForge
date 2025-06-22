import { notFound } from 'next/navigation';
import { prisma } from '@/prisma';
import CrosswordPage from '@/app/player/playerApp';

export default async function PlayerPage({ params, }: { params: Promise<{id: string}> }) {
  const { id } = await params
  const crossword = await prisma.crossword.findUnique({
    where: { id: parseInt(id) },
  });

  if (!crossword) return notFound();

  return (
    <CrosswordPage
      initialGrid={crossword.grid as any}
    />
  );
}
