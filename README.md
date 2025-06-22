This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

This is a web-application intended for generating crossword puzzles. It was made as the project for the author's bachelor's thesis at FER in the academic year 2024/2025.

## Getting Started

To run the program:
Git clone the repository
Generate a postgreSQL database from the backup
Set up .env and .env.local variables for auth.js (auth keys) and Prisma + Postgres DB connection

Run:
```bash
npm install
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) with your browser to see the result.
## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js. However Vercel cannot be used due to the edge runtime being incompatible with running the autofill script.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
