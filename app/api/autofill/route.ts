import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { transformGridForPython, applyLinesToGrid, Cell } from '@/app/creator/gridfuns';

export async function POST(req: NextRequest) {
  try {
    const { grid, minQuality, blacklist, language } = await req.json();
    
    // Step 1: Transform grid to lines
    const lines = transformGridForPython(grid);

    // Step 2: Spawn Python process
    const python = spawn('pypy3', ['scripts/autofill.py']);
    const input = JSON.stringify({
      lines: lines,
      minQuality: minQuality,
      blacklist: blacklist,
      language: language,
    });

    let result = '';
    let errorOutput = '';

    python.stdin.write(input);
    python.stdin.end();

    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    const code: number = await new Promise((resolve) => {
      python.on('close', resolve);
    });

    if (code !== 0 || errorOutput) {
      console.error('Python Error:', errorOutput);
      return NextResponse.json({ error: 'Autofill failed', details: errorOutput }, { status: 500 });
    }

    // Step 3: Apply lines back to grid
    const myresult = JSON.parse(result);
    if (myresult.message) {
      return NextResponse.json({ error: 'Autofill failed', details: myresult.message });
    }

    applyLinesToGrid(grid, myresult);

    // Step 4: Return updated grid 
    return NextResponse.json({ grid });
  } catch (err: any) {
    console.error('Error in autofill:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
