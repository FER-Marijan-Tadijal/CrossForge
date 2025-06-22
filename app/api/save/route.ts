import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'; // Make sure this exports a PrismaClient instance

export async function POST(req: Request) {
  const body = await req.json();
  const { id, title, publish, grid, blacklist } = body;

  let gridWrapper = {grid: grid, blacklist: blacklist}

  try {
    let crossword;
    if (publish) {
        crossword = await prisma.crossword.update({
        where: {
            id: id,
        },
        data: {
            /*title: title,*/
            grid: gridWrapper,
            publishTime: new Date(),
        }
        });
    } else {
        crossword = await prisma.crossword.update({
        where: {
            id: id,
        },
        data: {
            /*title: title,*/
            grid: gridWrapper,
        }
        });
    }

    return NextResponse.json({ success: true, crossword });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save crossword' }, { status: 500 });
  }
}
