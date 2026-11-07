# Foth Super Bowl Pool

One page for the Super Bowl squares pool: people sign up on it, and once a grid is full the numbers come out on the same page.

- Three grids: Grid 1 ($10), Grid 2 ($20), Grid 3 ($20). Names and prices can be changed in the admin panel.
- Each grid gets its own numbers, with a different set for Q1, Q2, Q3 and the Final.
- Payouts are 20% / 20% / 20% / 40% of what was sold. The Final includes overtime.
- If an unsold square wins a quarter, that money rolls into the next period. If an unsold square wins the Final, the money goes to the next sold square (to the right, then down to the next row).
- Sign-ups for a grid close when its numbers are revealed.
- ESPN fills in the teams and kickoff time once the conference championships are over, and fills in scores every 5 minutes during the game. You can still pick teams or type scores yourself.

It uses the same Firebase project and commissioner login as the Packer pool (`~/foth-packer-pools`). Its data is kept separately under `artifacts/foth-superbowl-pool`.

## Try it locally

```bash
npm install
npm run demo   # http://localhost:5174, with a fake in-memory database. Commissioner password: "demo"
npm run dev    # the real Firebase project
npm test       # payout math, plus ESPN parsing against last year's real Super Bowl
```

## Going live (one time)

1. **Security rules.** Both sites share one rules file, which lives in `~/foth-packer-pools/firestore.rules`. The Super Bowl block is already added there. Deploy it from that folder with `npx firebase-tools deploy --only firestore:rules`.
2. **Netlify.** Create a new site from this folder. Copy the same `VITE_FIREBASE_*` variables from the Packer pool site. For automatic teams and scores, also add `FIREBASE_SERVICE_ACCOUNT`.
3. **Open the live site and log in as the commissioner once.** This creates the three grids. Until you do, nobody can claim a square.
4. In the admin panel, enter your Venmo, PayPal and Zelle details. They're separate from the Packer pool's.
