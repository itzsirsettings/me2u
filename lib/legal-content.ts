export type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: PolicySection[];
};

export type PolicyDocument = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  lastUpdated: string;
  sections: PolicySection[];
};

export const legalLastUpdated = "May 19, 2026";

export const companyInfo = {
  legalName: "Merenity Systems",
  tradingName: "Me2U",
  email: "menenityhub@gmail.com",
  phones: ["+234 903 4162 902", "+234 806 5117 689", "+234 815 1583 421"],
  address: "Nigeria",
};

const appScope =
  "Me2U website, web app, mobile app, wallet, lending marketplace, referral system, KYC process, support channels, and related services.";

const contactBullets = [
  `Email: ${companyInfo.email}`,
  `Support: ${companyInfo.phones.join(", ")}`,
  `Company: ${companyInfo.legalName}`,
  `Address: ${companyInfo.address}`,
];

export const legalDocuments: PolicyDocument[] = [
  {
    slug: "data-policy",
    title: "Me2U Data Policy",
    eyebrow: "Data protection",
    summary:
      "How Me2U collects, uses, stores, shares, protects, and retains personal data across accounts, wallets, KYC, loans, referrals, support, and related services.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Introduction",
        paragraphs: [
          "Me2U is committed to protecting user data and handling personal information responsibly, transparently, and securely.",
          `This Data Policy explains how Me2U, legally owned and operated by ${companyInfo.legalName}, collects, uses, stores, shares, protects, and retains personal data when users access or use the Me2U platform.`,
          "Me2U provides a secure peer-to-peer lending and wallet platform that allows eligible users to create accounts, complete KYC, fund wallets, upload payment proof, access welcome bonuses, request or fund interest-free loans, repay loans, withdraw eligible balances, earn referral rewards, and access partner merchant offers.",
          "By using Me2U, you agree to this Data Policy and consent to the collection and processing of your information as described below.",
          `Applies to: ${appScope}`,
        ],
      },
      {
        title: "Information We Collect",
        subsections: [
          {
            title: "Information You Provide Directly",
            paragraphs: ["When you create or use a Me2U account, we may collect:"],
            bullets: [
              "Full name",
              "Email address",
              "Phone number",
              "Date of birth",
              "Password or secure login credentials",
              "Profile information",
              "Bank account details for wallet funding, withdrawals, repayments, and loan-related payments",
              "Payment transfer reference",
              "Payment receipt or proof of deposit",
              "Government-issued identification details where required",
              "BVN, NIN, selfie verification, or similar KYC information where required by law or verification partners",
              "Loan request information",
              "Lending offer information",
              "Repayment records",
              "Withdrawal requests",
              "Referral information",
              "Support messages, complaints, feedback, and dispute evidence",
            ],
          },
          {
            title: "Financial and Transaction Information",
            paragraphs: ["We may collect and process:"],
            bullets: [
              "Wallet funding history",
              "Registration deposit confirmation",
              "Loan amount requested",
              "Loan amount funded",
              "Loan repayment status",
              "Wallet balance records",
              "Withdrawal history",
              "Referral reward history",
              "Welcome bonus approval status",
              "Marketplace loan listings",
              "Bank transfer details",
              "Transaction timestamps",
              "Admin approval or rejection records",
              "Retained balance status where applicable",
            ],
          },
          {
            title: "KYC and Verification Data",
            paragraphs: ["To protect users and reduce fraud, Me2U may collect identity verification information, including:"],
            bullets: [
              "Name verification",
              "Phone number verification",
              "Email verification",
              "Identity document verification",
              "Selfie or liveness check where required",
              "Bank account ownership verification",
              "KYC approval status",
              "Risk review information",
              "Fraud prevention signals",
            ],
          },
          {
            title: "Information Collected Automatically",
            paragraphs: ["When you access Me2U, we may automatically collect:"],
            bullets: [
              "Device type",
              "Browser type",
              "Operating system",
              "IP address",
              "Approximate location",
              "Login history",
              "Session activity",
              "Pages viewed",
              "Features used",
              "Referral link activity",
              "Error logs",
              "Security logs",
              "Cookies and similar tracking technologies",
            ],
          },
          {
            title: "Information From Third Parties",
            paragraphs: ["We may receive information from:"],
            bullets: [
              "Payment processors",
              "Banks or payment partners",
              "Identity verification providers",
              "Fraud prevention providers",
              "Analytics providers",
              "Referral links",
              "Customer support tools",
              "Regulatory or law enforcement authorities where legally required",
            ],
          },
        ],
      },
      {
        title: "How We Use Your Information",
        paragraphs: ["Me2U uses personal data to:"],
        bullets: [
          "Create and manage user accounts",
          "Verify user identity and eligibility",
          "Process the ₦1,000 registration deposit",
          "Review uploaded payment proof",
          "Approve or decline wallet crediting",
          "Unlock the ₦2,000 welcome bonus after successful KYC approval",
          "Enable wallet funding",
          "Enable peer marketplace activity",
          "Allow users to create borrow requests",
          "Allow users to create lending offers",
          "Support 0% direct and peer lending flows",
          "Monitor retained wallet balance conditions",
          "Process loan repayments",
          "Process withdrawal requests after trust checks are complete",
          "Track referral rewards",
          "Prevent fraud, impersonation, account abuse, and unauthorized transactions",
          "Comply with KYC, AML, consumer protection, digital lending, tax, accounting, and legal obligations",
          "Provide customer support",
          "Resolve disputes",
          "Send account notifications, security alerts, transaction updates, and policy notices",
          "Improve app performance and user experience",
          "Analyze usage trends and platform reliability",
          "Develop new Me2U features",
          "Send marketing communications where permitted",
        ],
      },
      {
        title: "Legal Basis for Processing",
        paragraphs: ["Where applicable, Me2U processes personal data based on:"],
        bullets: [
          "User consent",
          "Contractual necessity",
          "Legal and regulatory compliance",
          "Fraud prevention and platform security",
          "Legitimate business interest",
          "Consumer protection obligations",
          "Dispute resolution requirements",
        ],
      },
      {
        title: "How We Share Information",
        paragraphs: [
          "Me2U does not sell user personal data.",
          "For peer lending, limited information may be shown to borrowers or lenders only where necessary for marketplace lending, repayment, or transaction transparency.",
          "Me2U will not publicly expose sensitive identity documents, passwords, private KYC documents, or full bank account information to other users.",
        ],
        bullets: [
          "Payment processors",
          "Banks and payment service providers",
          "KYC and identity verification providers",
          "Fraud prevention and risk monitoring providers",
          "Cloud hosting and infrastructure providers",
          "Customer support platforms",
          "Analytics providers",
          "Legal, audit, accounting, compliance, or regulatory advisers",
          "Regulators, courts, law enforcement, or public authorities where required by law",
          "Name or display name, loan listing details, loan amount, repayment duration, repayment status, marketplace activity status, and trust-related status where applicable",
        ],
      },
      {
        title: "Data Security",
        paragraphs: [
          "Me2U applies reasonable administrative, technical, and organizational measures to protect user data.",
          "No online system is 100% secure. Users are responsible for keeping passwords, devices, OTPs, transaction PINs, and login credentials safe.",
        ],
        bullets: [
          "Secure transmission of data",
          "Encrypted storage where appropriate",
          "Restricted employee and admin access",
          "Role-based permissions",
          "Password hashing",
          "Transaction monitoring",
          "Admin review for payment proof and wallet crediting",
          "KYC checks",
          "Login monitoring",
          "Fraud detection",
          "Secure backups",
          "Audit trails",
          "Incident response procedures",
        ],
      },
      {
        title: "User Rights",
        paragraphs: ["Subject to applicable law, users may request to:"],
        bullets: [
          "Access their personal data",
          "Correct inaccurate data",
          "Update account information",
          "Request deletion of certain data",
          "Withdraw marketing consent",
          "Request restriction of processing",
          "Request data portability where technically possible",
          "Object to certain processing activities",
          "Close their account",
          "Understand that some records may be retained for compliance, fraud prevention, accounting, disputes, lending records, repayment history, or legal obligations",
        ],
      },
      {
        title: "Data Retention",
        paragraphs: [
          "Me2U retains user data only for as long as necessary for business, legal, regulatory, security, and operational purposes.",
          "Typical retention periods may include account data while the account remains active and for a reasonable period after closure; transaction records as required by financial, accounting, tax, and regulatory obligations; KYC records as required for compliance and fraud prevention; support records for complaint resolution and service improvement; marketing preferences until the user opts out; and security logs for fraud prevention, investigation, and audit purposes.",
        ],
      },
      {
        title: "Children's Data",
        paragraphs: [
          "Me2U is not intended for users under 18 years old. Users must be at least 18 years old or the age of legal majority in their jurisdiction.",
          "If Me2U discovers that a minor has created an account, the account may be restricted, suspended, or deleted.",
        ],
      },
      {
        title: "International Data Transfers",
        paragraphs: [
          "Where Me2U uses technology providers, hosting services, verification partners, or payment providers outside Nigeria, user data may be processed in other countries.",
          "Me2U will take reasonable steps to ensure that such transfers are protected by appropriate contractual, technical, and legal safeguards.",
        ],
      },
      {
        title: "Changes to This Data Policy",
        paragraphs: [
          "Me2U may update this Data Policy from time to time. Material changes may be communicated through the app, website, email, or other reasonable notice.",
          "Continued use of Me2U after updates means the user accepts the updated policy.",
        ],
      },
      { title: "Contact", bullets: contactBullets },
    ],
  },
  {
    slug: "privacy-policy",
    title: "Me2U Privacy Policy",
    eyebrow: "Privacy",
    summary:
      "How Me2U protects privacy when users create accounts, complete KYC, fund wallets, borrow, lend, repay, refer, withdraw, and contact support.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Overview",
        paragraphs: [
          `This Privacy Policy explains how Me2U, legally owned by ${companyInfo.legalName}, protects your privacy when you use our website, app, wallet, lending marketplace, referral system, KYC process, support channels, and related services.`,
          "Me2U is built for secure peer-to-peer lending, verified wallets, 0% interest loan access, repayments, referrals, and wallet withdrawals subject to verification and approval.",
        ],
      },
      {
        title: "What Personal Information We Collect",
        bullets: [
          "Name",
          "Email address",
          "Phone number",
          "Date of birth",
          "Login details",
          "KYC information",
          "Bank account details",
          "Payment proof",
          "Transaction records",
          "Wallet funding records",
          "Loan request records",
          "Loan repayment records",
          "Referral activity",
          "Support messages",
          "Device and browser information",
          "IP address",
          "Security logs",
          "Approximate location",
          "Cookies and usage data",
        ],
      },
      {
        title: "Why We Collect Your Information",
        bullets: [
          "Register your account",
          "Verify your identity",
          "Confirm your registration deposit",
          "Approve your wallet activities",
          "Process welcome bonuses after KYC approval",
          "Enable peer lending and direct loan features",
          "Track repayments",
          "Manage withdrawals",
          "Pay referral rewards",
          "Prevent fraud",
          "Comply with legal obligations",
          "Provide customer support",
          "Improve Me2U services",
          "Send important notices",
        ],
      },
      {
        title: "KYC and Wallet Verification",
        paragraphs: [
          "To protect the Me2U community, withdrawals, loans, wallet features, and bonuses may require identity verification.",
          "Me2U may request documents or information needed to confirm that users are real, eligible, and not using the platform for fraud, impersonation, money laundering, or other prohibited activity.",
        ],
      },
      {
        title: "Payment Proof and Admin Review",
        paragraphs: [
          "When users fund their wallet or pay the registration deposit, Me2U may require payment reference details and uploaded proof.",
          "Payment proof may be reviewed manually or automatically before wallet crediting, welcome bonus approval, loan eligibility, or withdrawal access.",
        ],
      },
      {
        title: "How We Share Information",
        paragraphs: [
          "We do not sell your personal data.",
          "We may share limited data with payment partners, banks, identity verification partners, cloud hosting providers, fraud prevention providers, customer support tools, legal and compliance advisers, regulators, or authorities where required by law.",
        ],
      },
      {
        title: "Peer Marketplace Privacy",
        paragraphs: [
          "When you use Me2U's peer marketplace, some limited information may be visible to other users to support trust and transparency.",
          "This may include your display name, loan amount, lending offer, repayment status, trust indicators, and marketplace activity.",
          "Me2U does not expose your full KYC documents, password, sensitive payment proof, or complete bank information to other users.",
        ],
      },
      {
        title: "Cookies and Tracking",
        paragraphs: ["Me2U may use cookies or similar technologies to keep users logged in, improve website performance, understand app usage, prevent fraud, remember preferences, and measure marketing performance."],
      },
      {
        title: "Marketing Communications",
        paragraphs: [
          "Me2U may send product updates, referral promotions, wallet notices, financial education, merchant offers, and marketing messages.",
          "Users may opt out of non-essential marketing messages. Important service, security, legal, and transaction messages may still be sent.",
        ],
      },
      {
        title: "Data Protection Rights",
        paragraphs: [
          "Subject to applicable law, you may request access, correction, deletion, restriction, objection, or portability of your personal data.",
          "You may also withdraw consent where processing is based on consent.",
        ],
      },
      {
        title: "Security",
        paragraphs: [
          "Me2U uses reasonable security measures to protect user accounts and data. Users should also protect their passwords, OTPs, devices, and transaction credentials.",
          "Me2U will never ask users to share passwords, OTPs, or sensitive login details through unofficial channels.",
        ],
      },
      { title: "Contact", bullets: contactBullets },
    ],
  },
  {
    slug: "legal-information",
    title: "Me2U Legal Information",
    eyebrow: "Legal",
    summary:
      "Company ownership, lending notices, risk disclosures, intellectual property, prohibited activities, complaints, and governing law for Me2U.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Company Information",
        bullets: [
          `Legal Entity: ${companyInfo.legalName}`,
          `Trading Name: ${companyInfo.tradingName}`,
          `Ownership: Me2U is legally owned by ${companyInfo.legalName}`,
          `Registered Address: ${companyInfo.address}`,
          `Support Email: ${companyInfo.email}`,
          `Legal Email: ${companyInfo.email}`,
          `Phone/WhatsApp: ${companyInfo.phones.join(", ")}`,
        ],
      },
      {
        title: "About Me2U",
        paragraphs: [
          "Me2U is a financial technology platform that provides digital wallet features, KYC onboarding, wallet funding, peer-to-peer lending marketplace tools, direct loan workflows, repayment tools, referral rewards, partner merchant offers, and withdrawal processes subject to verification and approval.",
          "Me2U is designed to support interest-free lending between eligible and verified users.",
        ],
      },
      {
        title: "Important Legal Notice",
        paragraphs: [
          "Me2U is not a bank unless expressly licensed as one.",
          "Me2U does not represent that every user will qualify for a loan, bonus, referral reward, withdrawal, or marketplace transaction.",
          "All lending activity, wallet activity, registration deposit approval, welcome bonus approval, KYC approval, and withdrawal access may be subject to internal review, verification, fraud checks, wallet rules, regulatory requirements, and platform policies.",
        ],
      },
      {
        title: "Digital Lending Compliance Notice",
        paragraphs: [
          "Me2U may be subject to applicable Nigerian digital lending, consumer protection, data protection, anti-fraud, KYC, AML, tax, and financial services laws and regulations.",
          "Where required, Me2U will seek or maintain applicable registrations, approvals, licenses, compliance documentation, or partnerships before offering regulated services.",
          "Users should not treat Me2U as a guaranteed credit provider, investment platform, savings bank, deposit-taking institution, or insurance provider.",
        ],
      },
      {
        title: "No Guaranteed Loan Approval",
        paragraphs: [
          "Creating a Me2U account does not guarantee loan approval, marketplace matching, lending offer acceptance, withdrawal approval, bonus approval, referral reward approval, or any fixed income or investment return.",
          "Me2U may decline, suspend, reverse, delay, or investigate transactions where required for fraud prevention, policy compliance, wallet safety, or legal reasons.",
        ],
      },
      {
        title: "0% Interest Disclosure",
        paragraphs: [
          "Me2U's advertised loan model is based on 0% interest direct and peer marketplace loans.",
          "Users remain responsible for repaying any loan they accept or receive. A 0% interest loan does not mean free money. Loan terms, repayment date, wallet conditions, and repayment obligations must be understood before acceptance.",
        ],
      },
      {
        title: "Registration Deposit and Welcome Bonus Disclosure",
        paragraphs: [
          "Me2U may require a fixed onboarding or registration deposit before certain wallet features are activated.",
          "The ₦2,000 welcome bonus is subject to successful account creation, registration deposit confirmation, uploaded proof approval, KYC completion, admin review, internal risk checks, and platform rules.",
          "Me2U may modify, suspend, or discontinue bonuses or promotions with notice where required.",
        ],
      },
      {
        title: "Referral Reward Disclosure",
        paragraphs: [
          "Referral rewards may be paid only when a direct referral completes the required onboarding and verification process.",
          "Me2U may reject referral rewards where there is fraud, duplicate accounts, fake registrations, self-referrals, misleading activity, abuse, or violation of platform rules.",
        ],
      },
      {
        title: "Peer Lending Risk Disclosure",
        paragraphs: [
          "Peer lending involves risk.",
          "Borrowers must repay loans according to agreed terms. Lenders understand that lending to another user may carry repayment risk, delay risk, fraud risk, dispute risk, and recovery risk.",
          "Me2U may provide verification, marketplace tools, wallet conditions, admin review, and dispute support, but Me2U does not guarantee that every borrower will repay unless expressly stated in a separate written agreement.",
        ],
      },
      {
        title: "Intellectual Property",
        paragraphs: [
          "The Me2U name, logo, design, website content, app interface, text, graphics, icons, software, product structure, and brand assets belong to Me2U or its licensors.",
          "Users may not copy, reproduce, modify, resell, imitate, reverse-engineer, or use Me2U intellectual property without written permission.",
        ],
      },
      {
        title: "Complaints and Dispute Resolution",
        paragraphs: [
          `Users may submit complaints through ${companyInfo.email} or by calling ${companyInfo.phones.join(", ")}.`,
          "Me2U will aim to acknowledge complaints within a reasonable period and investigate complaints relating to wallet credits, loan listings, repayments, referrals, KYC, withdrawals, or account restrictions.",
          "If a complaint involves regulated financial or consumer lending activity, users may also have the right to approach relevant Nigerian regulators or consumer protection authorities.",
        ],
      },
      {
        title: "Prohibited Activities",
        bullets: [
          "Fraud",
          "Money laundering",
          "Terrorism financing",
          "Identity theft",
          "Fake KYC",
          "Duplicate accounts",
          "Loan scams",
          "Unauthorized access",
          "Account selling",
          "Harassment",
          "Illegal goods or services",
          "Gambling where prohibited",
          "Abuse of referral rewards",
          "Manipulation of loan listings",
          "Uploading fake payment proof",
          "Circumventing wallet rules",
          "Using another person's bank account without permission",
          "Misrepresenting repayment ability",
          "Threatening or abusing other users or staff",
        ],
      },
      {
        title: "Limitation of Liability",
        paragraphs: [
          "To the extent permitted by law, Me2U is not liable for indirect, incidental, special, consequential, or punitive losses arising from platform use, delayed payments, failed third-party services, user misconduct, incorrect information, network downtime, or unauthorized account access caused by user negligence.",
          "Nothing in this Legal Information excludes liability that cannot be excluded under applicable law.",
        ],
      },
      {
        title: "Governing Law",
        paragraphs: [
          "These legal notices are governed by the laws of the Federal Republic of Nigeria unless another applicable jurisdiction is required by law or stated in a separate agreement.",
        ],
      },
      { title: "Contact", bullets: [`Legal Email: ${companyInfo.email}`, `Compliance Email: ${companyInfo.email}`, `Company Address: ${companyInfo.address}`] },
    ],
  },
  {
    slug: "security-policy",
    title: "Me2U Security Policy",
    eyebrow: "Trust and security",
    summary:
      "How Me2U protects accounts, identity checks, wallets, loans, payment proof, fraud monitoring, security incidents, and vulnerability reports.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Security Overview",
        paragraphs: [
          "Me2U takes security seriously because users rely on the platform for wallet funding, peer lending, loan repayment, KYC, withdrawals, referrals, and financial activity.",
          "This Security Policy explains the steps Me2U takes to protect user accounts, personal data, wallet activity, and transaction records.",
        ],
      },
      {
        title: "Account Security",
        bullets: [
          "Password protection",
          "Secure login sessions",
          "OTP verification",
          "Email verification",
          "Phone verification",
          "Transaction PINs",
          "Device monitoring",
          "Suspicious login alerts",
          "Session timeout",
          "Account lock or review where suspicious activity is detected",
        ],
      },
      {
        title: "KYC and Identity Security",
        paragraphs: ["Me2U may require KYC before users can access loans, withdrawals, bonuses, or higher wallet limits."],
        bullets: [
          "Fake accounts",
          "Duplicate accounts",
          "Impersonation",
          "Fraudulent borrowing",
          "Unauthorized withdrawals",
          "Abuse of referral rewards",
          "Money laundering or prohibited transactions",
        ],
      },
      {
        title: "Wallet Security",
        bullets: [
          "Payment proof review",
          "Admin approval before wallet crediting",
          "Withdrawal restrictions until deposit and KYC are confirmed",
          "Retained balance conditions for active loans",
          "Transaction monitoring",
          "Account risk reviews",
          "Fraud checks before withdrawals",
          "Manual review of suspicious activity",
        ],
      },
      {
        title: "Loan and Marketplace Security",
        bullets: [
          "Verified user status",
          "Loan listing review",
          "Borrower and lender transaction history",
          "Wallet balance checks",
          "Repayment tracking",
          "Loan duration limits",
          "Dispute evidence upload",
          "Admin review",
          "Account restrictions where users violate loan rules",
        ],
      },
      {
        title: "Data Protection Measures",
        bullets: [
          "Encryption in transit",
          "Encryption at rest where appropriate",
          "Restricted admin access",
          "Role-based permissions",
          "Secure cloud infrastructure",
          "Secure backups",
          "Audit logs",
          "Monitoring tools",
          "Security testing",
          "Vulnerability reviews",
          "Incident response procedures",
        ],
      },
      {
        title: "Payment Proof Protection",
        paragraphs: ["Uploaded receipts, transfer references, and payment confirmations are treated as sensitive records."],
        bullets: [
          "Deposit confirmation",
          "Wallet crediting",
          "Fraud review",
          "Account verification",
          "Dispute resolution",
          "Audit and compliance",
        ],
      },
      {
        title: "Fraud Monitoring",
        paragraphs: ["Me2U may monitor platform activity for suspicious patterns. Accounts may be restricted or suspended during investigation."],
        bullets: [
          "Fake payment proofs",
          "Multiple accounts",
          "Suspicious referrals",
          "Unusual login activity",
          "Rapid wallet movement",
          "Repayment avoidance",
          "Repeated failed KYC",
          "Loan marketplace abuse",
          "Unauthorized withdrawal attempts",
        ],
      },
      {
        title: "What Users Should Do to Stay Safe",
        bullets: [
          "Use a strong password",
          "Never share OTPs",
          "Never share transaction PINs",
          "Avoid logging in on public devices",
          "Keep phones and email accounts secure",
          "Report suspicious activity quickly",
          "Verify that they are using the official Me2U website or app",
          "Avoid sending money to anyone claiming to be Me2U outside official payment channels",
          "Contact support if asked for sensitive information by anyone pretending to represent Me2U",
        ],
      },
      {
        title: "Security Incidents",
        paragraphs: ["If Me2U detects a security incident affecting user data or wallet activity, Me2U may investigate, restrict affected accounts, notify affected users where appropriate, notify regulators where legally required, reduce harm, and strengthen controls to prevent recurrence."],
      },
      {
        title: "Reporting Security Issues",
        bullets: [`Security Email: ${companyInfo.email}`, `Support Email: ${companyInfo.email}`, `Phone/WhatsApp: ${companyInfo.phones.join(", ")}`],
      },
    ],
  },
  {
    slug: "terms-of-use",
    title: "Me2U Terms of Use",
    eyebrow: "Terms",
    summary:
      "Rules for accounts, registration deposits, wallet funding, 0% loans, retained balances, repayments, withdrawals, referrals, fees, prohibited use, disputes, and liability.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "1. Agreement to Terms",
        paragraphs: [
          "These Terms of Use govern your access to and use of Me2U, including the website, app, wallet, KYC process, peer lending marketplace, direct loan features, referral system, support services, and related tools.",
          "By creating an account or using Me2U, you agree to these Terms, the Data Policy, Privacy Policy, Security Policy, and any other applicable Me2U rules.",
          "If you do not agree, you should not use Me2U.",
        ],
      },
      {
        title: "2. Eligibility",
        bullets: [
          "Be at least 18 years old",
          "Be legally capable of entering a binding agreement",
          "Provide accurate registration information",
          "Use your own identity",
          "Complete KYC where required",
          "Not be prohibited by law from using Me2U",
          "Not use Me2U for fraud, money laundering, or illegal activity",
          "Maintain only one personal account unless Me2U approves otherwise",
        ],
      },
      {
        title: "3. Account Registration",
        bullets: [
          "Provide accurate information",
          "Keep your details updated",
          "Use your own phone number and email address",
          "Protect your login credentials",
          "Not create fake or duplicate accounts",
          "Not allow another person to use your account",
          "Complete verification when requested",
          "Notify Me2U immediately if your account is compromised",
        ],
      },
      {
        title: "4. Me2U Services",
        paragraphs: ["Some features may be unavailable, restricted, delayed, or changed depending on verification status, account risk, wallet status, regulatory requirements, technical maintenance, or platform policy."],
        bullets: [
          "Digital wallet features",
          "Registration deposit processing",
          "Payment proof upload",
          "Admin review",
          "Welcome bonus approval after KYC",
          "Wallet funding",
          "Peer lending marketplace",
          "Direct loan requests",
          "Lending offers",
          "Loan repayment tools",
          "Withdrawal requests",
          "Referral rewards",
          "Partner merchant offers",
          "Support and dispute review",
        ],
      },
      {
        title: "5. Registration Deposit",
        paragraphs: [
          "Me2U may require a fixed registration deposit before certain wallet, bonus, loan, or withdrawal features are activated.",
          "Users must upload accurate transfer references and proof of payment.",
          "Submitting fake, edited, reused, or misleading payment proof may result in account suspension, bonus cancellation, wallet reversal, or legal action.",
        ],
      },
      {
        title: "6. Welcome Bonus",
        paragraphs: [
          "The Me2U welcome bonus is promotional and subject to approval.",
          "The welcome bonus is not a loan and does not require repayment unless it was credited due to fraud, technical error, duplicate account abuse, or policy violation.",
          "Me2U may change or discontinue bonuses with notice where required.",
        ],
        bullets: [
          "Successful account creation",
          "Registration deposit confirmation",
          "Valid payment proof",
          "Completed KYC",
          "Admin approval",
          "Risk review",
          "Compliance with Me2U rules",
        ],
      },
      {
        title: "7. Wallet Funding",
        paragraphs: [
          "Users may fund their Me2U wallet through supported payment methods.",
          "Wallet crediting may be delayed until Me2U confirms payment, reviews uploaded proof, verifies the transaction, and completes fraud checks.",
          "Me2U is not responsible for delays caused by banks, payment processors, incorrect transfer references, network issues, or user error.",
        ],
      },
      {
        title: "8. Loans and Peer Marketplace",
        paragraphs: [
          "Me2U supports interest-free direct and peer marketplace lending.",
          "Borrowers may create borrow requests. Lenders may create or accept lending offers. Borrowers must repay loans on time. Lenders accept that peer lending involves repayment risk.",
          "Me2U may restrict loan access for users who fail KYC, violate wallet conditions, default, abuse the marketplace, or trigger risk alerts.",
        ],
        bullets: [
          "Loan amount",
          "0% interest",
          "Repayment date",
          "Marketplace duration",
          "Wallet conditions",
          "Retained balance requirement",
          "Repayment obligation",
          "Dispute process",
        ],
      },
      {
        title: "9. 0% Interest Terms",
        paragraphs: [
          "Me2U may advertise 0% interest loans.",
          "0% interest does not mean the loan is free. Users who receive loans must repay the borrowed amount according to the agreed terms.",
          "Me2U may still charge lawful platform fees, service fees, wallet fees, withdrawal fees, or other clearly disclosed charges where applicable.",
        ],
      },
      {
        title: "10. Retained Wallet Balance",
        paragraphs: [
          "Where Me2U requires a retained wallet balance, users must maintain the required amount while an active loan remains unpaid.",
          "Attempting to bypass retained balance rules may result in withdrawal restriction, loan restriction, account review, or suspension.",
        ],
      },
      {
        title: "11. Repayments",
        paragraphs: [
          "Users must repay loans by the agreed repayment date.",
          "Repayments may be processed from wallet balance or other supported repayment methods.",
          "Late, failed, or disputed repayment may affect account status, marketplace access, loan eligibility, trust score, wallet activity, and future borrowing ability.",
        ],
      },
      {
        title: "12. Withdrawals",
        paragraphs: [
          "Withdrawals may be available only after registration deposit confirmation, KYC completion, wallet review, active loan checks, retained balance compliance, fraud and risk review, and admin approval where required.",
          "Me2U may delay, reject, or investigate withdrawals where fraud, account compromise, payment reversal, active loan risk, or policy violation is suspected.",
        ],
      },
      {
        title: "13. Referral Rewards",
        paragraphs: ["Users may earn referral rewards when direct referrals complete required onboarding and verification."],
        bullets: [
          "Fake accounts",
          "Duplicate accounts",
          "Self-referrals",
          "Misleading referrals",
          "Fraudulent onboarding",
          "Incomplete KYC",
          "Payment proof abuse",
          "Violation of referral rules",
        ],
      },
      {
        title: "14. Fees and Charges",
        paragraphs: ["Any applicable fees should be shown before the user completes the relevant transaction."],
        bullets: [
          "Registration deposit",
          "Wallet service fees",
          "Withdrawal fees",
          "Payment processing fees",
          "Marketplace service fees",
          "Account maintenance fees where applicable",
          "Other disclosed charges",
        ],
      },
      {
        title: "15. User Responsibilities",
        bullets: [
          "Use Me2U lawfully",
          "Provide truthful information",
          "Repay loans on time",
          "Maintain account security",
          "Use only authorized payment methods",
          "Avoid fraudulent activity",
          "Respect other users",
          "Follow wallet rules",
          "Follow KYC requirements",
          "Report errors or unauthorized activity quickly",
        ],
      },
      {
        title: "16. Prohibited Use",
        bullets: [
          "Commit fraud",
          "Upload fake payment proof",
          "Create duplicate accounts",
          "Impersonate another person",
          "Use stolen identity or bank details",
          "Use Me2U for illegal activity",
          "Abuse referrals",
          "Harass borrowers, lenders, staff, or users",
          "Attempt unauthorized access",
          "Bypass wallet or KYC rules",
          "Use bots or automated abuse tools",
          "Manipulate loan listings",
          "Misrepresent repayment ability",
          "Use Me2U for money laundering or terrorist financing",
          "Violate sanctions, court orders, or applicable law",
        ],
      },
      {
        title: "17. Account Suspension or Termination",
        paragraphs: [
          "Me2U may suspend, restrict, or terminate an account if the user violates these Terms, fraud is suspected, KYC fails, payment proof is false, required information is inaccurate, the account is compromised, the user abuses referrals, the user defaults or misuses lending features, or the action is required by law, regulator, court order, or compliance obligation.",
          "Where legally permitted, Me2U may notify the user and allow them to resolve outstanding issues.",
        ],
      },
      {
        title: "18. Disputes Between Users",
        paragraphs: [
          "For peer marketplace disputes, Me2U may review loan listing details, payment evidence, wallet records, repayment records, chat or support evidence, KYC status, and account history.",
          "Me2U may assist with dispute review but does not guarantee recovery from another user unless specifically stated in a separate written agreement.",
        ],
      },
      {
        title: "19. Platform Availability",
        paragraphs: [
          "Me2U aims to keep the platform available but does not guarantee uninterrupted service.",
          "Services may be unavailable due to maintenance, internet issues, bank downtime, payment processor failures, security incidents, regulatory requirements, technical faults, or force majeure events.",
        ],
      },
      {
        title: "20. Intellectual Property",
        paragraphs: [
          "All Me2U software, brand names, logos, designs, content, product flows, graphics, and platform features belong to Me2U or its licensors.",
          "Users may not copy, modify, resell, distribute, reverse-engineer, or exploit Me2U without written permission.",
        ],
      },
      {
        title: "21. Disclaimers",
        paragraphs: [
          "Me2U services are provided on an as available basis.",
          "Me2U does not guarantee loan approval, lender availability, borrower repayment, referral reward approval, bonus eligibility, instant withdrawal, continuous platform availability, error-free operation, or any specific financial outcome.",
          "Users should read all loan, wallet, withdrawal, bonus, and referral conditions before using Me2U.",
        ],
      },
      {
        title: "22. Limitation of Liability",
        paragraphs: [
          "To the extent permitted by law, Me2U is not liable for indirect, special, incidental, punitive, or consequential losses arising from use of the platform.",
          "Me2U is not responsible for losses caused by user negligence, shared passwords or OTPs, fake accounts created by users, incorrect payment details, bank or payment processor downtime, third-party service failure, network issues, unauthorized access caused by user failure to secure account details, or peer borrower default unless otherwise agreed in writing.",
        ],
      },
      {
        title: "23. Indemnity",
        paragraphs: [
          "Users agree to indemnify Me2U, its directors, staff, partners, and affiliates against claims, losses, damages, penalties, costs, or expenses arising from user misuse of Me2U, violation of these Terms, fraudulent activity, illegal activity, false information, loan default or dispute, unauthorized use of another person's data, or breach of applicable law.",
        ],
      },
      {
        title: "24. Changes to These Terms",
        paragraphs: [
          "Me2U may update these Terms from time to time.",
          "Material changes may be communicated through the website, app, email, or other reasonable notice.",
          "Continued use of Me2U after changes means acceptance of the updated Terms.",
        ],
      },
      {
        title: "25. Governing Law",
        paragraphs: ["These Terms are governed by the laws of the Federal Republic of Nigeria unless otherwise required by applicable law."],
      },
      {
        title: "26. Contact",
        bullets: [`Support Email: ${companyInfo.email}`, `Legal Email: ${companyInfo.email}`, `Compliance Email: ${companyInfo.email}`, `Phone/WhatsApp: ${companyInfo.phones.join(", ")}`, `Address: ${companyInfo.address}`],
      },
    ],
  },
  {
    slug: "cookie-policy",
    title: "Me2U Cookie Policy",
    eyebrow: "Cookies",
    summary:
      "How Me2U uses essential, preference, analytics, marketing, and security cookies or similar technologies across the website and app.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Overview",
        paragraphs: [
          "Me2U may use cookies, local storage, device identifiers, pixels, and similar technologies to support secure sessions, remember choices, improve performance, understand usage, prevent fraud, and measure marketing performance.",
          "Some cookies are essential for the platform to work. Users may disable some cookies through browser settings, but some features may not work properly without essential cookies.",
        ],
      },
      {
        title: "Types of Cookies We May Use",
        bullets: [
          "Essential cookies for login sessions, authentication, security, fraud prevention, and service delivery",
          "Preference cookies for language, display, theme, and remembered settings",
          "Analytics cookies for app performance, usage trends, reliability, and error reporting",
          "Marketing cookies for referral performance, campaign measurement, and permitted promotional activity",
          "Security cookies for suspicious activity detection, session monitoring, and account protection",
        ],
      },
      {
        title: "Managing Cookies",
        paragraphs: [
          "You may manage cookies through your browser or device settings. Blocking essential cookies may prevent account login, KYC submission, wallet flows, loan flows, referral tracking, or support features from working correctly.",
          "Where required by law, Me2U may request consent before using non-essential cookies.",
        ],
      },
      { title: "Contact", bullets: contactBullets },
    ],
  },
  {
    slug: "lending-disclosure",
    title: "Me2U Lending Disclosure",
    eyebrow: "Loan risk",
    summary:
      "Clear disclosures for Me2U's 0% interest direct and peer marketplace lending, repayment obligations, retained balance rules, and lending risks.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "0% Interest Does Not Mean Free Money",
        paragraphs: [
          "Me2U's advertised loan model is based on 0% interest direct and peer marketplace loans.",
          "Users who receive loans must repay the borrowed amount according to the accepted terms. Loan terms, repayment date, wallet conditions, and repayment obligations must be understood before acceptance.",
        ],
      },
      {
        title: "Eligibility and Approval",
        paragraphs: [
          "Creating an account does not guarantee loan approval, lender availability, borrower matching, bonus eligibility, referral rewards, or withdrawal approval.",
          "Loan access may depend on registration deposit confirmation, uploaded proof approval, KYC completion, wallet status, retained balance conditions, fraud checks, repayment history, and platform rules.",
        ],
      },
      {
        title: "Peer Lending Risk",
        paragraphs: [
          "Peer lending involves repayment risk, delay risk, fraud risk, dispute risk, and recovery risk.",
          "Lenders should review borrower information, listing terms, duration, repayment status, trust indicators, and available dispute tools before funding a loan.",
          "Me2U may assist with verification, wallet conditions, admin review, repayment tracking, and dispute support, but Me2U does not guarantee that every borrower will repay unless expressly stated in a separate written agreement.",
        ],
      },
      {
        title: "Repayment and Retained Balance",
        paragraphs: [
          "Borrowers must repay loans by the agreed repayment date.",
          "Where Me2U requires a retained wallet balance, users must maintain the required amount while an active loan remains unpaid.",
          "Late, failed, or disputed repayment may affect account status, marketplace access, loan eligibility, trust score, wallet activity, and future borrowing ability.",
        ],
      },
      { title: "Contact", bullets: contactBullets },
    ],
  },
  {
    slug: "referral-terms",
    title: "Me2U Referral Terms",
    eyebrow: "Referral rewards",
    summary:
      "Rules for referral rewards, verified direct referrals, abuse prevention, reward reversals, and promotional changes.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "How Referral Rewards Work",
        paragraphs: [
          "Users may earn referral rewards when direct referrals complete the required Me2U onboarding and verification process.",
          "Referral eligibility may require account creation, registration deposit confirmation, valid uploaded proof, completed KYC, admin approval, and compliance with platform rules.",
        ],
      },
      {
        title: "Rejected or Reversed Rewards",
        paragraphs: ["Me2U may reject, delay, cancel, or reverse referral rewards where there is fraud, duplicate accounts, fake registrations, self-referrals, misleading activity, abuse, or violation of platform rules."],
        bullets: [
          "Fake accounts",
          "Duplicate accounts",
          "Self-referrals",
          "Misleading referrals",
          "Fraudulent onboarding",
          "Incomplete KYC",
          "Payment proof abuse",
          "Referral reward abuse",
        ],
      },
      {
        title: "Promotional Changes",
        paragraphs: [
          "Referral rewards are promotional and may be modified, suspended, or discontinued with notice where required.",
          "Me2U may run different referral campaigns for different periods, locations, or user segments where lawful and clearly disclosed.",
        ],
      },
      { title: "Contact", bullets: contactBullets },
    ],
  },
  {
    slug: "complaint-resolution",
    title: "Me2U Complaint Resolution Policy",
    eyebrow: "Complaints",
    summary:
      "How users can report problems with wallet credits, KYC, loans, referrals, repayments, withdrawals, disputes, fraud, or account restrictions.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "How to Submit a Complaint",
        paragraphs: [
          `Users may submit complaints through ${companyInfo.email} or by contacting ${companyInfo.phones.join(", ")}.`,
          "Users should include their registered name, phone number, email address, transaction reference, loan listing or repayment details, screenshots or receipts where relevant, and a clear description of the issue.",
        ],
      },
      {
        title: "What Me2U May Review",
        bullets: [
          "Wallet funding records",
          "Uploaded payment proof",
          "KYC status",
          "Loan listing details",
          "Repayment records",
          "Withdrawal requests",
          "Referral activity",
          "Support messages",
          "Dispute evidence",
          "Account history and fraud indicators",
        ],
      },
      {
        title: "Complaint Handling",
        paragraphs: [
          "Me2U will aim to acknowledge complaints within a reasonable period and investigate complaints relating to wallet credits, loan listings, repayments, referrals, KYC, withdrawals, or account restrictions.",
          "Where a complaint requires information from a bank, payment processor, verification partner, lender, borrower, or regulator, resolution may take longer.",
          "If a complaint involves regulated financial or consumer lending activity, users may also have the right to approach relevant Nigerian regulators or consumer protection authorities.",
        ],
      },
      { title: "Contact", bullets: contactBullets },
    ],
  },
];

export const legalDocumentMap: Record<string, PolicyDocument> = Object.fromEntries(
  legalDocuments.map((document) => [document.slug, document]),
);

export const supportDocuments: PolicyDocument[] = [
  {
    slug: "support",
    title: "Me2U Support",
    eyebrow: "Help",
    summary:
      "Official Me2U support channels for account, wallet, KYC, loan, repayment, referral, withdrawal, complaint, and fraud questions.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Official Support Channels",
        bullets: [`Email: ${companyInfo.email}`, ...companyInfo.phones.map((phone) => `Phone/WhatsApp: ${phone}`)],
      },
      {
        title: "What Support Can Help With",
        bullets: [
          "Account registration",
          "Registration deposit and payment proof",
          "KYC guidance",
          "Wallet funding and withdrawals",
          "Loan requests and marketplace activity",
          "Repayments",
          "Referral rewards",
          "Fraud reports",
          "Complaints and disputes",
        ],
      },
    ],
  },
  {
    slug: "report-fraud",
    title: "Report Fraud",
    eyebrow: "Security help",
    summary:
      "Report suspected fake payment proof, duplicate accounts, impersonation, unauthorized access, referral abuse, loan scams, or withdrawal attempts.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Report Immediately",
        paragraphs: [
          `Send fraud reports to ${companyInfo.email} or contact ${companyInfo.phones.join(", ")}.`,
          "Include your registered details, the suspicious account or transaction, screenshots, payment references, and a short description of what happened.",
        ],
      },
      {
        title: "Me2U May Review",
        bullets: [
          "Fake payment proofs",
          "Multiple accounts",
          "Suspicious referrals",
          "Unusual login activity",
          "Loan marketplace abuse",
          "Unauthorized withdrawal attempts",
          "Impersonation or fake KYC",
        ],
      },
    ],
  },
  {
    slug: "account-safety",
    title: "Account Safety",
    eyebrow: "Security help",
    summary: "How users can protect their Me2U account, wallet, OTPs, transaction PINs, devices, and support interactions.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Stay Safe",
        bullets: [
          "Use a strong password",
          "Never share OTPs",
          "Never share transaction PINs",
          "Avoid logging in on public devices",
          "Keep phones and email accounts secure",
          "Use only official Me2U payment and support channels",
          "Report suspicious activity quickly",
        ],
      },
      {
        title: "Me2U Will Not Ask For",
        bullets: [
          "Your password",
          "Your OTP",
          "Your transaction PIN",
          "Unofficial payments to staff or agents",
          "Sensitive login details through unofficial channels",
        ],
      },
    ],
  },
  {
    slug: "kyc-help",
    title: "KYC Help",
    eyebrow: "Verification help",
    summary: "KYC guidance for identity verification, bank details, account ownership, welcome bonuses, withdrawals, and loan eligibility.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Why KYC Is Required",
        paragraphs: [
          "Me2U may require KYC before users can access loans, withdrawals, bonuses, or higher wallet limits.",
          "KYC helps prevent fake accounts, duplicate accounts, impersonation, fraudulent borrowing, unauthorized withdrawals, referral abuse, money laundering, and prohibited transactions.",
        ],
      },
      {
        title: "KYC May Include",
        bullets: [
          "Name verification",
          "Phone number verification",
          "Email verification",
          "Identity document verification",
          "Selfie or liveness check where required",
          "Bank account ownership verification",
          "Risk review",
        ],
      },
    ],
  },
  {
    slug: "loan-repayment-help",
    title: "Loan Repayment Help",
    eyebrow: "Loan help",
    summary: "Guidance for repaying Me2U direct or peer marketplace loans and understanding late, failed, or disputed repayments.",
    lastUpdated: legalLastUpdated,
    sections: [
      {
        title: "Repayment Responsibility",
        paragraphs: [
          "Borrowers must repay loans by the agreed repayment date.",
          "Repayments may be processed from wallet balance or other supported repayment methods.",
          "A 0% interest loan does not mean free money. The borrowed amount must still be repaid.",
        ],
      },
      {
        title: "Late or Failed Repayments",
        paragraphs: [
          "Late, failed, or disputed repayment may affect account status, marketplace access, loan eligibility, trust score, wallet activity, and future borrowing ability.",
          "Users should contact support quickly if repayment records, wallet balance, or transaction proof appears incorrect.",
        ],
      },
    ],
  },
];

export const supportDocumentMap: Record<string, PolicyDocument> = Object.fromEntries(
  supportDocuments.map((document) => [document.slug, document]),
);

export const legalFooterGroups = [
  {
    title: "Legal",
    links: [
      { label: "Data Policy", href: "/legal/data-policy" },
      { label: "Privacy Policy", href: "/legal/privacy-policy" },
      { label: "Terms of Use", href: "/legal/terms-of-use" },
      { label: "Security Policy", href: "/legal/security-policy" },
      { label: "Cookie Policy", href: "/legal/cookie-policy" },
      { label: "Lending Disclosure", href: "/legal/lending-disclosure" },
      { label: "Referral Terms", href: "/legal/referral-terms" },
      { label: "Complaint Resolution Policy", href: "/legal/complaint-resolution" },
      { label: "Legal Information", href: "/legal" },
    ],
  },
  {
    title: "Help & Security",
    links: [
      { label: "Support", href: "/support" },
      { label: "Trust & Security", href: "/security" },
      { label: "Report Fraud", href: "/support/report-fraud" },
      { label: "Account Safety", href: "/support/account-safety" },
      { label: "KYC Help", href: "/support/kyc-help" },
      { label: "Loan Repayment Help", href: "/support/loan-repayment-help" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: companyInfo.email, href: `mailto:${companyInfo.email}` },
      ...companyInfo.phones.map((phone) => ({ label: phone, href: `tel:${phone.replace(/\s+/g, "")}` })),
    ],
  },
];

export const footerDisclaimer =
  "Me2U is a peer-to-peer lending and wallet technology platform. Loan access, welcome bonuses, withdrawals, referrals, wallet activity, and marketplace features are subject to registration, deposit confirmation, KYC, fraud checks, admin review, wallet rules, and approval. Loans require repayment. Terms apply.";
