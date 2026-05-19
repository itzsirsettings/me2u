import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import LandingPageV2Interactions from "@/components/LandingPageV2Interactions";

const landingAssetBase = "/landing_page_v2";
const landingSourcePath = path.join(process.cwd(), "landing_page_v2", "index.html");

export const metadata: Metadata = {
  title: "Me2U - Trust-Based Interest-Free Peer Lending",
  description:
    "Me2U is a secure peer-to-peer lending app with trust scores, credit builder tools, verified wallets, KYC, marketplace lending, savings goals, daily wallet services, welcome bonuses, and referral rewards.",
};

const copyReplacements: ReadonlyArray<readonly [string, string]> = [
  ["by PremiumTrust Bank", "by Merenity Systems"],
  ["Me2U ecosystem", "Me2U lending flow"],
  [
    "One app for spending, saving, shopping, and merchant growth.",
    "One app for verified wallets, peer matching, interest-free loans, and repayments.",
  ],
  [">Get the app<", ">Create account<"],
  [">Get Started<", ">Create account<"],
  [">Learn more</button>", ">Create account</button>"],
  [
    '<button class="nav-link plain-button" data-open-demo>Demo</button>',
    '<button class="nav-link plain-button" data-open-login>Login</button>',
  ],
  [
    '<a href="#business"><span class="mega-icon">▣</span><strong>Me2U Business</strong><small>Connect your business with Me2U.</small></a>',
    '<a href="#business"><span class="mega-icon">▣</span><strong>Peer Marketplace</strong><small>Create borrow requests and lending offers.</small></a>',
  ],
  [
    '<a href="#payments"><span class="mega-icon">↗</span><strong>Payment</strong><small>Free transfers, bills, and instalment payments.</small></a>',
    '<a href="#payments"><span class="mega-icon">↗</span><strong>Protected Onboarding</strong><small>Your ₦2,000 welcome bonus is waiting.</small></a>',
  ],
  [
    '<a href="#budget"><span class="mega-icon">◎</span><strong>Budget & Save</strong><small>Create savings plans and budgets.</small></a>',
    '<a href="#budget"><span class="mega-icon">◎</span><strong>Wallet Funding</strong><small>Top up with a transfer reference and receipt.</small></a>',
  ],
  [
    '<a href="#rewards"><span class="mega-icon">✦</span><strong>Refer & Earn</strong><small>Earn by referring friends and family.</small></a>',
    '<a href="#rewards"><span class="mega-icon">✦</span><strong>Referral Rewards</strong><small>Earn ₦500 when direct referrals complete onboarding.</small></a>',
  ],
  [
    '<a href="#insurance"><span class="mega-icon">◈</span><strong>Insurance</strong><small>Buy insurance, view certificates, and make claims.</small></a>',
    '<a href="#insurance"><span class="mega-icon">◈</span><strong>KYC & Withdrawals</strong><small>Verify before withdrawing from your wallet.</small></a>',
  ],
  [
    '<a href="#bnpl"><span class="mega-icon">⌁</span><strong>Buy a Car</strong><small>Pay in instalments or outright.</small></a>',
    '<a href="#bnpl"><span class="mega-icon">⌁</span><strong>0% Loans</strong><small>0% interest loan from ₦5,000.</small></a>',
  ],
  ["Products", "Product"],
  ["Freedom to pay your way.", "Secure peer lending."],
  [
    "Spend, send, split payments, pay bills, save towards your goals, manage insurance, earn rewards, and bring your business online from one polished app experience.",
    "Register and verify your wallet.<br />Borrow or lend at 0%.<br />₦2,000 bonus after KYC.",
  ],
  ["<b>0%</b> instalment interest option", "<b>₦2,000</b> welcome bonus"],
  ["<b>Free</b> everyday transfers", "<b>0%</b> direct and peer loans"],
  ["<b>Secure</b> card and account payments", "<b>1-14</b> day marketplace durations"],
  ["Animated Me2U app preview", "Animated Me2U lending app preview"],
  ["Wallet dashboard illustration", "Verified wallet dashboard illustration"],
  ["Available balance", "Wallet balance"],
  ["₦485,240.00", "₦12,000.00"],
  ["<button>Send</button><button>Bills</button><button>BNPL</button><button>Save</button>", "<button>Fund</button><button>Market</button><button>Loans</button><button>KYC</button>"],
  ["Free transfer", "Registration deposit"],
  ["₦22,500", "₦1,000"],
  ["Electricity bill", "Welcome bonus"],
  ["₦18,000", "₦2,000"],
  ["Reward earned", "Referral reward"],
  ["₦750", "₦500"],
  ["Instalment dashboard illustration", "Interest-free loan dashboard illustration"],
  ["Buy now, pay later", "Direct loan"],
  ["4 instalments", "0% interest"],
  ["Goal reached", "KYC verified"],
  ["Me2U Card", "Peer match"],
  ["interest option", "interest"],
  ["₦0", "₦2k"],
  ["transfer charges", "credit"],
  ["24/7", "14d"],
  ["app access", "loan duration"],
  ["Me2U feature carousel", "Me2U lending feature carousel"],
  ["Unlimited Free Transfer", "Me2U Trust Score"],
  ["Make seamless transfers without charges.", "Build trust from KYC, repayments, wallet activity, referrals, and dispute-free lending."],
  ["Pay Bills without Charges", "Credit Builder"],
  ["Airtime, data, electricity, and TV subscription.", "Earn repayment badges, monthly reports, and higher-limit eligibility."],
  ["Buy Now, Pay Later", "0% interest loans"],
  ["Buy products and spread payments.", "0% interest loan from ₦5,000."],
  ["Premium Insurance", "KYC-gated withdrawals"],
  ["Pay premium in instalments at 0% interest.", "Withdraw after deposit confirmation and KYC completion."],
  ["Budget and Save", "Fund Wallet"],
  ["Create budgets and save unspent portions.", "Top up by transfer and upload payment proof."],
  ["Pay with Me2U Card", "Peer Marketplace"],
  ["Seamless, secure, swift payments.", "Create or accept borrow and lending listings."],
  ["Get Reward", "Referral Rewards"],
  ["Earn when you transact and refer.", "Earn when direct referrals complete onboarding."],
  ["Top Deals", "Loan Repayment"],
  ["App offers.", "Repay active loans directly from wallet balance."],
  ["Online Business", "Admin Review"],
  ["Get a customised webpage.", "Payment proof is reviewed before crediting wallets."],
  ["Website Integration", "Trust Conditions"],
  ["Add Me2U to your app or website.", "Active loans keep 50% retained in wallet."],
  ["Transfer and pay bills completely free.", "Start with a protected wallet and verified onboarding."],
  [
    "Make daily payments feel effortless with a refined money movement experience for transfers, airtime, data, electricity, TV subscriptions, and recurring expenses.",
    "Me2U turns account creation into a clear trust flow: registration deposit, payment proof, KYC, welcome bonus, and wallet access.",
  ],
  ["Unlimited Free Transfer", "Registration deposit"],
  ["Send money through a clean, quick, and reassuring flow.", "Pay the fixed ₦1,000 deposit and upload your transfer reference plus receipt."],
  ["Pay Bills Without Charges", "Welcome bonus"],
  ["Pay for airtime, data plans, electricity, and TV subscription.", "Your ₦2,000 welcome bonus is waiting."],
  ["Customise savings plans, create budgets, and save the unspent portion.", "Complete KYC after your deposit is confirmed to unlock withdrawals and loans."],
  ["Payment analytics illustration", "Wallet activity illustration"],
  ["Total paid this month", "Approved wallet activity"],
  ["1245800", "12000"],
  ["Transfer successful", "Deposit proof submitted"],
  ["No additional transaction charge", "Awaiting approval"],
  ["Buy now, pay later for real-life purchases.", "Access 0% loans directly or from matched peers."],
  [
    "Split product payments at your convenience across categories such as power systems, gadgets, cars, furniture, and household equipment.",
    "Use Me2U for direct loans and peer marketplace loans with transparent durations, wallet checks, and 0% interest.",
  ],
  ["Buy now pay later categories", "Me2U loan categories"],
  ["Solar Panels, Inverters & Batteries", "Direct loan"],
  ["Electronics, Phones & Gadgets", "Borrow request"],
  ["Own your dream car", "Lending offer"],
  ["Furniture & Household Equipment", "Repayment"],
  ["Featured category", "Loan path"],
  [
    "With Me2U, renewable energy becomes easier to access through flexible payment options.",
    "0% interest loan from ₦5,000 after your registration deposit and KYC are complete.",
  ],
  ["How pay in instalments works", "How 0% loans work"],
  ["Sign up on Me2U", "Create your account"],
  ["Add product to cart", "Confirm deposit and KYC"],
  ["Pay in instalments", "Keep 50% in wallet"],
  ["Easy checkout", "Request and repay"],
  ["Pay your insurance premium with ease.", "Withdraw only after the trust checks are complete."],
  [
    "Users can pay insurance premiums outright or in instalments, view certificates, and manage insurance actions inside a clear digital flow.",
    "Withdrawals unlock after your registration deposit is confirmed and KYC is completed. Active loans require the retained 50% condition to remain in your wallet.",
  ],
  ["Insurance payment", "KYC status"],
  ["Goal reached • 100% paid", "Verified profile • withdrawals enabled"],
  ["Pay in instalments", "Deposit confirmed"],
  ["Flexible repayment at no extra cost", "₦1,000 registration proof approved"],
  ["Pay with cards", "Wallet funded"],
  ["Secure Debit or Credit Card payment", "Transfer reference and receipt reviewed"],
  ["Pay with accounts", "Retained balance"],
  ["Make seamless payments", "50% loan condition stays protected"],
  ["Budget, save, earn, and plan the Me2U way.", "Wallet, marketplace, rewards, and repayment in one flow."],
  [
    "Explore the wider app experience built around practical lifestyle, commerce, and financial planning features.",
    "Every major product action maps to the live app: fund the wallet, join the marketplace, request loans, repay, withdraw, and refer.",
  ],
  ["Budget and save", "Fund wallet"],
  ["Save towards goals, create expense budgets, monitor spending, and protect what remains.", "Transfer to the payment account, enter the amount and reference, then upload proof."],
  ["Transact, refer family and friends, and receive rewards from product engagement.", "Earn ₦500 when a direct referral completes verified onboarding."],
  ["Planner", "0% loans"],
  ["Secure documents, plan events, and receive helpful notifications from the app.", "0% interest loan from ₦5,000 after KYC."],
  ["Pay with Me2U card", "Repay loans"],
  ["Make secure, swift card-style payments with a refined confirmation experience.", "Repay active loans from wallet balance and clear the way for future requests."],
  ["Get top deals on Me2U", "Withdraw safely"],
  ["Discover in-app offers across Me2U.", "Withdraw only after deposit confirmation and KYC verification."],
  ["Secure app flow", "Peer marketplace"],
  ["Use clean confirmations, transparent states, and confidence-building transaction feedback.", "Publish borrow requests or lending offers with 0% interest and short durations."],
  ["Me2U works for your business.", "A lending marketplace for both sides."],
  [
    "Boost your business online or in-store, offer pay-in-instalments, create a free digital shop, and integrate Me2U into your website or app.",
    "Borrowers and lenders meet in one shared market. Listings stay interest-free, clear, and tied to wallet balances and trust signals.",
  ],
  ["Business tools", "Marketplace tools"],
  ["Free online webpage", "Borrow request"],
  ["Free shop on Me2U", "Lending offer"],
  ["Offer instalments", "Fund a loan"],
  ["Integrate Me2U", "Accept an offer"],
  ["Get a free online webpage", "Create a borrow request"],
  ["Create a customised webpage for your business so customers can browse products and make online purchases.", "Post the amount you need, keep the interest rate at 0%, and set a duration from 1 to 14 days."],
  [">Sign up<", ">Create account<"],
  ["Merchant Store", "Marketplace Board"],
  ["Powered by Me2U", "Borrow and lend at 0%"],
  ["Pay outright", "Fund this loan"],
  ["Pay in instalments", "Accept offer"],
  ["Complete Me2U feature matrix", "Complete Me2U lending feature matrix"],
  ["Everything is connected in one product story.", "Everything builds trust before users borrow, lend, save, pay bills, or support family."],
  ["Unlimited free transfers", "Registration deposit"],
  ["Buy now pay later", "Welcome bonus"],
  ["Buy products on the e-shop and spread your payments.", "₦2,000 wallet bonus after KYC approval."],
  ["Insurance premiums", "Me2U Trust Score"],
  ["Pay premiums in instalments at 0% interest rate.", "Improve limits through KYC, repayments, wallet activity, referrals, and account age."],
  ["Pay bills", "Bills and utilities"],
  ["Pay airtime, data, electricity, and TV subscription without charges.", "Use the wallet for airtime, data, electricity, cable TV, school fees, QR payments, and payment links."],
  ["Budget & save", "Savings goals"],
  ["Create budgets, monitor spending, and save unspent funds.", "Create emergency, rent, school fee, business capital, locked, and group savings goals."],
  ["Earn when you transact and refer family or friends.", "Earn ₦500 when direct referrals complete onboarding."],
  ["Access in-app deals.", "Merchant deals from verified food, pharmacy, transport, school, phone, and training businesses."],
  ["Bring business online", "Me2U Circles"],
  ["Get a free store and customised business webpage.", "Create private lending groups for families, schools, churches, traders, and businesses."],
  ["Offer instalments", "Protected lending"],
  ["Enable online or in-store pay-in-instalments.", "Review agreement summaries, repayment countdowns, receipts, and dispute evidence."],
  ["Integrate checkout", "Global profile"],
  ["Add Me2U to websites and apps.", "Choose country, currency, and language while lending remains country-gated until local setup is ready."],
  ["We’re building the smartest way to spend, send, and split payment anytime, anywhere. Zero stress.", "Register, complete your deposit, verify KYC, then use Me2U to fund your wallet, match with peers, and manage 0% loans."],
  ["Ready to pay?", "Ready to borrow?"],
  ["<button>Send</button><button>Bills</button><button>Shop</button><button>Save</button>", "<button>Fund</button><button>Market</button><button>Loans</button><button>KYC</button>"],
  ["Answers before users ask.", "Answers before you sign up."],
  [
    "A polished landing page should reduce doubt quickly with clear answers, confident copy, and visible support routes.",
    "Me2U keeps the lending flow understandable before users create an account.",
  ],
  ["What can I do with Me2U?", "What is Me2U?"],
  [
    "You can make transfers, pay bills, buy now and pay later, manage insurance payments, budget, save, earn rewards, and use business tools.",
    "Me2U is a secure Nigerian peer-to-peer lending app with wallets, KYC, marketplace listings, loans, repayments, withdrawals, and referral rewards.",
  ],
  ["Does this rebuild collect customer data?", "What happens after registration?"],
  [
    "No. This static rebuild has no login, credential collection, payment capture, or backend data submission.",
    "You create an account, pay the ₦1,000 registration deposit, upload proof, and unlock your ₦2,000 welcome bonus after KYC.",
  ],
  ["Can official app links and brand assets be added?", "Are loans interest-free?"],
  [
    "Yes. Replace the placeholders with approved official assets and store links only if you have authorization.",
    "Yes. Both direct and peer marketplace loans are 0% interest. Marketplace listings use durations from 1 to 14 days.",
  ],
  ["Tailor-made solutions that ensure a lifestyle of comfort.", "Secure peer-to-peer lending with trust scores, credit builder tools, global-ready wallets, savings goals, circles, merchant deals, and repayment tools."],
  ["Licensed by the Central Bank of Nigeria", "Owned by Merenity Systems"],
  ["Contact us", "Support"],
  ["Security center", "Trust and security"],
  ["contactpremium@premiumtrustbank.com", "menenityhub@gmail.com"],
  [
    "1612 Adeola Hopewell Street, Victoria Island, Lagos State, Nigeria",
    "Me2U is legally owned by Merenity Systems and operates support through the official contacts listed here.",
  ],
  ["0700PREMIUM (07007736486)<br />02013302777", "+234 903 4162 902<br />+234 806 5117 689<br />+234 815 1583 421"],
  ["©2026 Me2U by Premium Trust Bank", "©2026 Me2U by Merenity Systems"],
  ["Download Me2U", "Create your Me2U account"],
  [
    "Use official store buttons here when you are authorized to connect the final website to live app listings.",
    "Register in the web app, then complete the wallet deposit and KYC flow.",
  ],
  ["<button class=\"store-badge\"><span>▶</span><small>Get it on</small><strong>Google Play</strong></button>", "<button class=\"store-badge\" data-open-register><span>↗</span><small>Start with</small><strong>Register</strong></button>"],
  ["<button class=\"store-badge\"><span></span><small>Download on the</small><strong>App Store</strong></button>", "<button class=\"store-badge\" data-open-login><span>◎</span><small>Already joined?</small><strong>Login</strong></button>"],
  ["Animated demo placeholder", "Deposit → KYC → Bonus → Loans"],
  ["Embed the approved Me2U product demo video here.", "The live app flow starts with registration, deposit proof, KYC, welcome bonus, then wallet, marketplace, and loan actions."],
  ["Review Cookie Consent", "Review app notices"],
  ["Add your approved cookie consent script and policy details here before production deployment.", "Add approved cookie, privacy, and financial-service notices before production deployment."],
  ["Accept", "Understood"],
  ["<span>Get the app</span>", "<span>Create account</span>"],
];

function applyLandingCopy(source: string) {
  return copyReplacements.reduce((html, [from, to]) => html.replaceAll(from, to), source);
}

function renderPublicProofSection() {
  const proofCards = [
    {
      label: "Processed safely",
      value: "Live total required",
      detail: "Requires an audited aggregate before a currency total is published.",
    },
    {
      label: "Verified wallets created",
      value: "Live total required",
      detail: "KYC-approved profiles, not marketing estimates.",
    },
    {
      label: "Loans completed",
      value: "Live total required",
      detail: "Completed loan records from the app ledger.",
    },
    {
      label: "Users rewarded",
      value: "Live total required",
      detail: "Requires distinct rewarded-user aggregation before publishing.",
    },
    {
      label: "Referrals paid",
      value: "Live total required",
      detail: "Verified referral reward payouts.",
    },
    {
      label: "Successful repayments",
      value: "Live total required",
      detail: "Repayment records confirmed in wallet history.",
    },
  ];

  return `
    <section class="section more-section" id="public-proof" aria-labelledby="public-proof-title">
      <div class="container">
        <div class="section-heading reveal reveal-up">
          <span class="eyebrow">Public proof</span>
          <h2 id="public-proof-title">Real trust numbers, never inflated.</h2>
          <p>Me2U should publish only live, audited app totals. If a number is not connected yet, it stays marked as a live total requirement.</p>
        </div>
        <div class="feature-grid">
          ${proofCards
            .map(
              (card, index) => `
                <article class="feature-tile reveal reveal-up">
                  <span>${String(index + 1).padStart(2, "0")}</span>
                  <h3>${card.label}</h3>
                  <p><strong>${card.value}</strong></p>
                  <p>${card.detail}</p>
                </article>
              `,
            )
            .join("")}
        </div>
        <div class="section-copy reveal reveal-up" style="margin-top: 48px;">
          <span class="eyebrow">Success stories</span>
          <h2>Testimonials only after real consent.</h2>
          <p>User stories should come from verified borrowers, lenders, referrers, and savers who agree to be featured. Until then, Me2U should leave this section as a consent-based publishing queue instead of inventing quotes.</p>
        </div>
        <div class="section-copy reveal reveal-up" style="margin-top: 48px;">
          <span class="eyebrow">Native app readiness</span>
          <h2>Install now, stores when approved.</h2>
          <p>Me2U is PWA-ready for supported browsers. Android, iPhone, push notifications, ratings, and store listings should launch only when the production app, compliance notices, and approved store assets are ready.</p>
          <div class="store-buttons">
            <button class="store-badge" data-open-register><span>↗</span><small>Start with</small><strong>Web app</strong></button>
            <button class="store-badge" data-open-register><span>◎</span><small>Prepare for</small><strong>App stores</strong></button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function addPublicProofSection(markup: string) {
  const section = renderPublicProofSection();
  return markup.includes("</main>") ? markup.replace("</main>", `${section}</main>`) : `${markup}${section}`;
}

function getLandingMarkup() {
  const source = readFileSync(landingSourcePath, "utf8");
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";

  return applyLandingCopy(body)
    .replaceAll('src="assets/me2_logo.svg"', `src="${landingAssetBase}/assets/me2_logo.svg"`)
    .replaceAll("data-open-download", "data-open-register")
    .replace(/<script src="script\.js"><\/script>\s*/i, "");
}

export default function Landing() {
  const landingMarkup = addPublicProofSection(getLandingMarkup());

  return (
    <>
      <link rel="preload" href={`${landingAssetBase}/styles.css`} as="style" />
      <link rel="stylesheet" href={`${landingAssetBase}/styles.css`} />
      <link rel="stylesheet" href={`${landingAssetBase}/brand-enhancements.css`} />
      <div data-landing-v2-root dangerouslySetInnerHTML={{ __html: landingMarkup }} />
      <LandingPageV2Interactions />
    </>
  );
}
