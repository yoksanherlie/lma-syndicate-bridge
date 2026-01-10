## Inspiration

In the industry today, the LMA agreements are the _"source of truth"_ for everything regarding the loan and is designed to be the _"living"_ document where borrower and agent can see the all the terms for the loan. But most of the time for the loans, these _"living"_ documents are the biggest pain points and bottleneck for the borrower's or agent's everyday workflow on keeping track of what's inside the loan documents because it is usually a very long PDF file where information can easily get buried. Terms and definitions are also usually several pages long and very difficult to interpret as it is behind a very sophisticated legal logic.

To battle this pain point, I built a web-based app that can ingest the long LMA-style Facility Agreement PDF file and uses LLMs to interpret it and present the significant information to the users (borrower & facility agent) so they're able to keep track of the loan easier and more effectively.

## What it does

1. Extract significant data points and definitions from the Loan Agreement file and present it in a structured digital human-readable format.

2. Borrowers can see how they are complying against all the financial covenants in the agreement, such as:

	- How much headroom does the Borrower have in regards to the Consolidated Leverage Ratio in respect to that Relevant Period

	- Keep track of their compliance status in respect to their obligations stated in the Loan Agreement

3. Borrower can also prepare and review their Compliance Certificate automatically so they don't have to pull the data needed one by one (which usually takes a lot of back and forth and could last for days)

4. Borrower are presented with action recommendations to achieve specific targets set on the loan (that are usually hidden behind a lot of legal logic)

5. Facility Agent has one-stop-shop dashboard of all the loans that they're responsible for

	- where they can verify the contents of the data mentioned in the Compliance Certificate submitted by the Borrower

6. View of SLL (Sustainability Linked Loans) definitions and targets, if applicable.

## How we built it

* **Backend & Database**: Supabase
* **Frontend**: React + Vite (TypeScript)
* **AI Functionality**: Gemini API
* **PDF Functionality**: `pdf-lib`

## Challenges we ran into

* **Complex LMA-style document**: Even though LMA-style agreement has its own format, different facility agreement will still have different format. So to unify this is quite a challenge (room for improvement in the future)
* **LMA specific knowledge**: During this hackathon, I spent quite a good time trying to understand what LMA is about and all the stuff related to syndicated loan market with no financial background at all

## Accomplishments that we're proud of

### 1. AI ingestion engine
Built a system to ingest loan agreements complex legal documents and extract important definitions dynamically and extract relevant data

### 2. Reliable reconciliation engine
Built a reliable reconciliation workflow to map ERP data (mock) to the items mentioned in the Loan Agreement for reliable and automatic "add-backs" of EBITDA.

### 3. Recommendation engine
Use extracted data from the Loan Agreement file and check if the borrower is on track to hit the target and recommends actions to do to achieve that target and be able to save on interest.

### 4. Tested with real data
We used real LMA-style facility agreement PDF file to test our solution to try best mimick the real-world situation that the users are facing in their workflow everyday.

## What we learned

* Gained a better understanding of the industry especially the everyday workflow of LMA-style loans for the borrower and the facility agent on the whole lifecycle of the loan.

* Building AI automation in the finance industry is difficult yet has a very good ROI as we can see first-hand how it is replacing the tedious work that is consuming so much time of the users.

## What's next for LMA Loan Tracker Management App

* Sustainability (ESG) data linked via API and fed into AI model to calculate interest saving and recommendations for further actions

* **Basket Manager for _Negative Covenants_**: To help borrower better plan their financial strategy and corporate decisions so they're able to move quicker with a decision-making tool that keep tracks of the borrower's financial health with "permitted" actions that they are allowed (or not allowed) to do based on the agreement on the LMA-style Loan Agreement (and preventing accidental "Covenant Event of Default")
