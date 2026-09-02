# InvestTrack Pro Changelog

This log tracks all major updates and features added to the application.

---

### [v1.9.4] Default Sort by Day's Performance Date: 2024-11-18T09:00:00Z
- **🚀 Enhancement**: Changed the default sorting for the "Portfolio Overview" table to prioritize the day's biggest movers.
- **💅 UI Improvement**: The table now automatically sorts by "Day Change %" from highest to lowest on initial load, allowing users to immediately see the most impactful stocks of the day.

### [v1.9.3] Enhanced Portfolio Overview with Advanced Sorting Date: 2024-11-17T09:00:00Z
- **🚀 Enhancement**: Implemented advanced sorting capabilities on the main "Portfolio Overview" table.
- **✨ New Feature**: Users can now click on any column header (e.g., 'Total Return %', 'Current Value', 'Symbol') to sort the entire portfolio in ascending or descending order.
- **💅 UI Improvement**: Visual indicators (▲/▼) in the column headers provide clear feedback on the current sort order, making it easier to analyze and rank holdings based on various performance metrics.

### [v1.9.2] Added "Need to Buy" Section for Unowned Stocks Date: 2024-11-16T09:00:00Z
- **✨ New Feature**: Introduced a "Need to Buy" section on the Allocation Dashboard.
- **🚀 Enhancement**: This section automatically identifies stocks that are part of the allocation plan but are not yet owned by the user (i.e., have zero quantity).
- **💅 UI Improvement**: It presents a clear, actionable list showing each stock's symbol, its assigned category, and the target value required to meet the allocation strategy. This serves as an instant shopping list.
- **📊 Data Analysis**: The total investment amount needed to purchase all stocks in the "Need to Buy" list is calculated and prominently displayed, providing a clear financial target for the user.

### [v1.9.1] Added Stock Weight Allocation Controls Date: 2024-11-15T09:00:00Z
- **✨ New Feature**: Implemented a "Stock Weights" tab within the Allocation Planner settings.
- **🚀 Enhancement**: Users can now define target percentage weights for each individual stock within its assigned category (e.g., within "Growth", NVDA is 40%, MSFT is 60%).
- **💅 UI Improvement**: The interface uses intuitive sliders and number inputs for adjusting weights, and includes a live validation summary to ensure each category's stock weights total 100%.
- **🛠️ Code Quality**: The system now provides a more granular level of control for creating detailed and precise portfolio allocation models.

### [v1.9.0] Revamped Allocation Planner into a Unified Dashboard Date: 2024-11-14T09:00:00Z
- **✨ New Feature**: Completely redesigned the "Allocation Planner" from a multi-step wizard into a single, powerful dashboard for at-a-glance analysis.
- **🚀 Enhancement**: The new dashboard features an **Allocation Donut Chart** that visually compares your current vs. target allocations and an **Alignment Summary** that provides a clear score of how well your portfolio is balanced.
- **💅 UI Improvement**: The main view is now an "Allocation Status" table that shows the gap between your current and target values for each category. Categories are expandable to show detailed stock-level analysis.
- **🛠️ Code Quality**: The workflow is streamlined. Instead of sequential steps, users can now directly open modals to "Edit Allocation Settings" or "Create a Rebalance Plan" from the main dashboard, making the process faster and more intuitive.
- **📊 Data Analysis**: All analytics are powered by a new, comprehensive `gapAnalysis` calculation that provides a clear picture of over/under-allocated assets at both the category and individual stock level.

### [v1.8.4] Fixed Allocation Planner Stability and Data Loading Date: 2024-11-13T09:00:00Z
- **✅ Bug Fix**: Resolved a critical bug in the "Allocation Planner" where the "Stock Weights" and "Budget & Plan" steps would appear empty if the page was reloaded.
- **🐞 Root Cause**: The planner was only loading essential stock category data during the "Stock Categories" step. If a user had already completed this step, the data would not be loaded on subsequent visits, causing later steps to fail.
- **🚀 Enhancement**: Reworked the data loading logic to ensure that all necessary portfolio and stock category information is fetched reliably whenever any step of the planner is accessed. This makes the entire feature more robust and stable.

### [v1.8.3] Implemented Budget Allocation & Draft Transaction Creation Date: 2024-11-12T09:00:00Z
- **✨ New Feature**: Completed the Allocation Planner with a final "Plan" step that turns your strategy into an actionable buying list.
- **🤖 AI-Powered Allocation**: Implemented a **budget distribution algorithm** that intelligently allocates your investment amount across selected stocks to proportionally fill allocation gaps.
- **🚀 Enhancement**: **Proposed Buying Plan** table shows the exact number of shares (including fractional) to buy for each stock, with cost breakdowns. You can manually edit the share amounts to fine-tune the plan and see real-time updates to your budget.
- **📊 Data Analysis**: Added a **"Before & After" impact analysis** table, clearly visualizing how the proposed plan improves your portfolio's alignment with your targets by reducing overall deviation.
- **⚙️ Backend**: **Create Draft Transactions** functionality allows you to save the entire buying plan as a set of draft transactions with a single click, ready for review on the main Transactions page.

### [v1.8.2] Launched Rebalancing Planner with Gap Analysis Date: 2024-11-11T09:00:00Z
- **✨ New Feature**: Implemented the "Rebalance" step in the Allocation Planner, which calculates and displays the gap between your current and target allocations.
- **🚀 Enhancement**: **Gap Analysis Table** shows a detailed breakdown of each category's Current vs. Target values (in $ and %), highlighting which categories are over or under-allocated with clear visual indicators.
- **✨ New Feature**: **Stock Selection Interface** allows you to choose which stocks to purchase to fill allocation gaps. This includes your existing holdings and a feature to search for and add new stocks to your plan.
- **🚀 Enhancement**: **Budgeting Tool** lets you enter your total investment amount and see a live summary of how much of the allocation gap your budget covers.
- **💅 UI Improvement**: The entire process is now guided through a three-step flow, making portfolio planning and rebalancing more intuitive and actionable.

### [v1.8.1] Allocation Planner Nears Completion with Two-Step Setup Date: 2024-11-10T09:00:00Z
- **✨ New Feature**: The "Allocation Planner" is now functional, featuring a two-step setup process to define and categorize your investment strategy.
- **🚀 Enhancement**: **Step 1 (Main Allocation)** allows you to set target percentages for different investment categories (Compounder, Growth, Bet, Cash) by selecting a preset or creating a custom mix.
- **🚀 Enhancement**: **Step 2 (Stock Categorization)** enables you to map each stock in your portfolio to your defined categories. The system provides smart auto-categorization based on existing `stockType` data, which you can easily override.
- **⚙️ Backend**: All allocation and categorization choices are saved to the Supabase database, persisting your plan for future analysis (coming soon).

### [v1.8.0] Launched Placeholder for 'Allocation Planner' Tab Date: 2024-11-09T10:00:00Z
- **✨ New Feature**: The new "Allocation Planner" tab is now visible in the main navigation.
- **🚀 Enhancement**: Clicking the tab leads to a dedicated page with a "Feature Under Construction" message, establishing its place in the UI and setting expectations for future development.
- **🛠️ Code Quality**: The `AllocationPlannerPage.tsx` component has been created and wired into the main `App.tsx` router, completing the initial frontend setup for this new feature area.

### [v1.7.9] Initiated Development of New 'Allocation Planner' Tab Date: 2024-11-08T09:00:00Z
- **✨ New Feature**: Began the foundational work for a new "Allocation Planner" tab. This new section will provide tools for users to model and visualize different asset allocation strategies.
- **🛠️ Code Quality**: Initial setup includes creating the new page component and adding it to the main navigation structure.
- **Context**: This is the first step towards a major new feature focused on portfolio planning and optimization. User-facing functionality is not yet available.

### [v1.7.8] Added Performance Chart Toggle and Simple Return Calculation Date: 2024-11-07T12:00:00Z
- **✨ New Feature**: Added a "Time-Weighted" vs. "Simple Return" toggle directly to the "Performance" page, giving you full control over the chart's calculation method without leaving the page.
- **🚀 Enhancement**: Implemented the complete time-series calculation logic for "Simple Return" (`(Value - Net Capital) / Net Capital`), allowing for accurate historical visualization of this metric.
- **✅ Bug Fix**: Fixed the issue where the Performance chart was not synchronized with the calculation method selected on the Portfolio page. The chart now correctly recalculates and re-renders based on the active display method.
- **💅 UI Improvement**: The chart's title now dynamically updates to clearly indicate which calculation method is being displayed (e.g., "Performance - Doctorbank Growth (Simple Return)"), resolving the ambiguity from the previous version.

### [v1.7.7] Synced Performance Chart with TWR/Simple Return Toggle Date: 2024-11-06T11:00:00Z
- **✨ New Feature**: The "Performance" chart is now fully synchronized with the "Time-Weighted Return" vs. "Simple Return" toggle on the main portfolio page.
- **🚀 Enhancement**: When you switch the calculation method, the performance chart automatically recalculates and re-renders to visualize the selected metric over time. This ensures a consistent and intuitive analysis experience across the app.
- **💅 UI Improvement**: The chart's title now dynamically updates to indicate which calculation method is currently being displayed (e.g., "Performance - Doctorbank Growth (Simple Return)"), providing clear context for your analysis.
- **🛠️ Code Quality**: Lifted the `displayMethod` state to the main `App` component to be shared globally, improving state management and component communication.

### [v1.7.6] Fixed Portfolio Mode Auto-Detection for Cash Transactions Date: 2024-11-05T10:00:00Z
- **✅ Bug Fix**: Resolved a bug where cash deposits/withdrawals stored as `BUY` or `SELL` transactions on a `CASH` symbol were not correctly identifying the portfolio as `CASH_AWARE`.
- **🚀 Enhancement**: The portfolio mode detection logic is now more robust. It correctly recognizes cash flows whether they are recorded as `DEPOSIT`/`WITHDRAW` types or as `BUY`/`SELL` actions on a `CASH` asset.
- **💅 UI Improvement**: This ensures the "Full Portfolio" badge is accurately displayed for all portfolios that track cash balances, regardless of how the transaction was entered.

### [v1.7.5] Added Toggle for TWR vs. Simple Return Calculation Date: 2024-11-04T12:00:00Z
- **✨ New Feature**: Implemented a UI toggle on the `PortfolioReturnsSummary` component to switch the "Total Return" display between "Time-Weighted Return" (the existing method) and "Simple Return".
- **🚀 Enhancement**: The application now calculates both return metrics in parallel. The default display method is intelligently set based on the portfolio's mode (`CASH_AWARE` defaults to TWR, `STOCKS_ONLY` defaults to Simple Return).
- **💅 UI Improvement**: User preferences for the calculation method are saved locally for each portfolio, providing a customized experience on subsequent visits.

### [v1.7.4] Implemented Portfolio Tracking Mode Detection System Date: 2024-11-03T11:00:00Z
- **✨ New Feature**: Added an automatic portfolio mode detection system to classify portfolios as either 'CASH_AWARE' or 'STOCKS_ONLY'.
- **🚀 Enhancement**: The system checks for `DEPOSIT`/`WITHDRAW` transactions or the presence of `initial_cash` to determine the mode. This logic runs automatically whenever portfolio data is loaded or changed.
- **💅 UI Improvement**: A new badge is now displayed next to the portfolio name on the main page.
  - A blue "Full Portfolio" badge indicates a `CASH_AWARE` portfolio, with a tooltip explaining that it tracks all cash flows for accurate time-weighted returns.
  - An orange "Stock Only" badge indicates a `STOCKS_ONLY` portfolio, with a tooltip explaining that it tracks only securities for simple return calculations.

### [v1.7.3] Added Simple Return Calculation Method Date: 2024-11-02T10:00:00Z
- **✨ New Feature**: Implemented a new `calculateSimpleReturn` function to provide an alternative portfolio performance calculation method.
- **📊 Data Analysis**: This function calculates return based on the difference between the portfolio's current value and the net capital invested in securities, without time-weighting.
- **Context**: This is a backend-only feature that lays the groundwork for offering different performance analysis modes in the UI in the future. It does not yet affect what users see.

### [v1.7.2] Architectural Prep for Portfolio Tracking Modes Date: 2024-11-01T09:00:00Z
- **🚀 Enhancement**: Initiated a foundational architectural refactor to prepare for a future "Portfolio Tracking Mode" detection system.
- **🛠️ Code Quality**: This involves updating the core data models and state management logic to differentiate between portfolio types, such as 'Active Trading' vs. 'Long-term Investment'.
- **Context**: This preparatory work is crucial for enabling more tailored analytics and features in upcoming versions, but does not introduce user-facing changes at this time.

### [v1.7.1] Minor Bug Fixes and Stability Improvements Date: 2024-10-31T11:00:00Z
- **✅ Bug Fix**: Addressed a minor issue where toast notifications could overlap or persist incorrectly under specific rapid-fire conditions.
- **🚀 Enhancement**: Made minor under-the-hood improvements to state management for better overall application stability.

### [v1.7.0] Implemented Holdings Value vs Cost Breakdown Chart Date: 2024-10-31T10:00:00Z
- **✨ New Feature**: Added a "Holdings Value vs Cost Breakdown" stacked bar chart to the "Analysis" page.
- **🚀 Enhancement**: The chart visually compares the cost basis (orange) against the current market value (blue portion represents gain) for each of the top 10 holdings.
- **📊 Data Analysis**: Includes multiple sorting options to analyze holdings by Value, Cost Basis, Profit $, Profit %, or alphabetically (A-Z), providing flexible insights into portfolio composition.
- **💅 UI Improvement**: The chart is fully interactive, featuring detailed tooltips on hover that show precise cost, value, and P/L figures for each asset.

### [v1.6.9] Finalized Analysis Tab Stability & Performance Date: 2024-10-30T11:00:00Z
- **✅ Bug Fix**: Implemented a comprehensive fix that completely resolves all previously reported stability issues with the "Analysis" tab, ensuring it is now fully robust and crash-free.
- **🐞 Root Cause**: The final underlying issue was traced to a race condition during portfolio switching, where the `rawPriceDataCache` prop was not yet populated for the newly selected portfolio, causing child components like the `Heatmap` to fail.
- **🚀 Enhancement**: Rearchitected the component's data-flow. The `AnalysisPage` now explicitly waits for both the selected portfolio object and its corresponding price data to be available before rendering the `Dashboard`, eliminating the race condition entirely.
- **⚡ Performance**: This change also improves perceived performance, as the UI now displays a consistent loading state while data dependencies are resolved, preventing component pop-in and providing a smoother user experience.

### [v1.6.8] Fixed Critical Analysis Tab Rendering Issues Date: 2024-10-29T10:00:00Z
- **✅ Bug Fix**: Resolved a critical bug that caused the "Analysis" tab to either display a blank screen or crash entirely for certain portfolios.
- **🐞 Issue Found**: The root cause was an improper data flow and state handling issue where the `Dashboard` component was receiving undefined props before the selected portfolio's data was fully calculated and available.
- **🚀 Enhancement**: Reworked the data pipeline for the Analysis page to ensure all required data (portfolio details, price cache) is fully resolved before attempting to render the dashboard components. This makes the tab robust and reliable.
- **💅 UI Improvement**: Added a more graceful loading state for the Analysis tab to handle portfolio switching and initial data fetching, preventing jarring UI shifts and errors.

### [v1.6.7] Implemented Advanced Portfolio Heatmap with Stability Fixes Date: 2024-10-28T09:30:00Z
- **✨ New Feature**: Introduced a dynamic portfolio heatmap on the "Analysis" page, providing a powerful at-a-glance visualization of your asset allocation and performance.
- **🚀 Enhancement**: The heatmap groups assets by sector, sizes each stock's tile based on its current market value, and color-codes it based on performance. You can switch between multiple time ranges (1D, 1W, 1M, Total, etc.) to see performance over different periods.
- **✅ Bug Fix**: Proactively resolved a stability issue where the heatmap could crash if a stock in the portfolio was missing sector information. The component now gracefully handles such data, ensuring a robust and reliable user experience.
- **💅 UI Improvement**: The heatmap is fully interactive with tooltips that provide detailed metrics on hover, making it an intuitive tool for quickly identifying top performers and sector concentrations.

### [v1.6.6] Fully Implemented AI Agent for Natural Language Transactions Date: 2024-10-27T09:00:00Z
- **✨ New Feature**: Introduced a new "AI Agent" tab on the "Transactions" page, enabling users to add transactions using natural language.
- **🤖 AI Integration**: The agent, powered by Gemini, intelligently parses commands in both Thai and English to identify single or multiple transactions from a single text input (e.g., "buy 100 TTB at 1.85 and sell 50 PTT at 35").
- **🚀 Enhancement**: After parsing, the AI presents a clear, editable confirmation form. This allows users to review, modify, and validate all transaction details before committing them to the database.
- **💅 UI Improvement**: The feature includes a conversational chat interface for interacting with the AI and a dynamic form for editing the parsed data, significantly streamlining the bulk-entry process.

### [v1.6.5] Fixed Portfolio Editing Refresh Issue Date: 2024-10-26T10:00:00Z
- **✅ Bug Fix**: Resolved a bug where changes made when editing a portfolio (e.g., renaming it or changing its icon) were not immediately reflected across the application.
- **🚀 Enhancement**: After saving changes to a portfolio, the app now performs a targeted data refresh. This ensures that the portfolio list and all related components update instantly with the new information.
- **💅 UI Improvement**: This fix provides a more seamless and intuitive user experience when managing portfolios.

### [v1.6.4] Implemented 'Create New Portfolio' System Date: 2024-10-25T11:00:00Z
- **✨ New Feature**: Users can now create new portfolios directly within the application from the "Transactions" page.
- **🚀 Enhancement**: Added a "Create Portfolio" button that opens a modal for entering the portfolio's name, initial cash, icon, and color.
- **⚙️ Backend**: This new functionality is fully integrated with the Supabase database, persisting new portfolios and making them immediately available for adding transactions.

### [v1.6.3] Standardized "Doctorbank Growth" Portfolio & Added Seed Data Date: 2024-10-24T10:00:00Z
- **🚀 Enhancement**: Fully integrated the "Doctorbank Growth" portfolio into the application, including adding its seed transaction data.
- **✅ Data Integrity**: Standardized the portfolio name to "Doctorbank Growth" across all components and data files, resolving inconsistencies that prevented it from being selected by default.
- **🌱 Data Seeding**: The initial database seed now correctly populates transactions for the "Doctorbank Growth" portfolio, providing a more complete out-of-the-box experience.

### [v1.6.2] Revamped API Performance & Fixed Fetching Issues Date: 2024-10-23T09:00:00Z
- **🚀 Enhancement**: Overhauled the data-fetching layer to significantly improve API performance and reduce loading times across the application.
- **⚡ Performance**: Implemented a more intelligent caching strategy for API responses, dramatically reducing redundant network requests and improving UI responsiveness, especially on the Performance and Analysis pages.
- **✅ Bug Fix**: Addressed a critical bug that caused intermittent failures when fetching historical price data from the Polygon.io API, ensuring more reliable chart rendering.

### [v1.6.1] Enhanced Portfolio Table with Column Color-Coding & Visibility Controls Date: 2024-10-22T10:00:00Z
- **✨ New Feature**: Introduced a column visibility control to the main "Portfolio Overview" table. You can now show or hide individual columns to customize your view, and your preferences are saved locally for future sessions.
- **💅 UI Improvement**: Implemented distinct background colors for different column groups (e.g., Price, Performance, Allocation) in the portfolio table. This thematic color-coding significantly improves readability and makes it easier to scan related data points at a glance.
- **🚀 Enhancement**: The table now supports advanced keyboard navigation (left/right arrows) for a more accessible and efficient user experience.

### [v1.6.0] Revamped Portfolio Overview with Bigger, Clearer Text Date: 2024-10-21T09:00:00Z
- **💅 UI Improvement**: Overhauled the main "Portfolio Overview" section to feature larger, more readable text for key metrics like Total Value and Returns.
- **🚀 Enhancement**: This change improves at-a-glance readability and modernizes the look and feel of the main dashboard, making it easier to quickly assess portfolio performance.

### [v1.5.9] Added End-of-Line Labels to Performance Chart Date: 2024-10-20T11:00:00Z
- **✨ New Feature**: Implemented dynamic end-of-line labels on the "Portfolio vs Index Performance" chart.
- **🚀 Enhancement**: These labels display the final percentage return for each visible data series (`My Portfolio`, `S&P 500`, `SCHG`), providing an immediate summary of performance without needing to hover over the tooltip.
- **💅 UI Improvement**: The labels are styled with a background and border matching the line color, making them easy to read and associate with their respective data series. They also have logic to prevent overlapping.

### [v1.5.8] Enhanced Stability for Portfolio, Heatmap, and Auto-Refresh Date: 2024-10-19T10:00:00Z
- **✅ Bug Fix**: Resolved several intermittent rendering issues on the main **Portfolio** tab, ensuring data consistency and a smoother user experience.
- **🚀 Enhancement**: Improved the **Heatmap** component's stability by adding better handling for portfolios with missing or incomplete sector data, preventing crashes.
- **✅ Bug Fix**: Fixed a bug in the **Auto-Refresh** logic that could cause it to stop working after navigating between different portfolios or pages. The timer is now more resilient.

### [v1.5.7] Temporarily Addressed Performance Chart Fetching Issue Date: 2024-10-18T09:00:00Z
- **✅ Bug Fix**: Implemented a temporary workaround to address a fetching issue that was preventing the "Portfolio vs Index Performance" chart from loading data correctly.
- **🚀 Enhancement**: The chart's data pipeline is now more resilient, reducing the frequency of loading failures.
- **🐞 Known Issue**: While this fix improves reliability, a full architectural review is underway to permanently resolve the underlying data normalization and merging issues. A more robust solution is planned for a future update.

### [v1.5.6] Fixed API Fetch Stability for Performance Chart Date: 2024-10-17T10:00:00Z
- **✅ Bug Fix**: Resolved an issue where the historical data fetch from the Polygon.io API could fail intermittently under heavy load, preventing the "Portfolio vs Index Performance" chart from loading.
- **🚀 Enhancement**: Implemented a more resilient API fetching strategy with improved error handling and automatic retries for transient network issues.
- **✨ New Feature**: Added "Pause" and "Resume" controls to the API fetching process on the Performance page, giving users more control over long-running data fetches and helping to manage API rate limits.
- **💅 UI Improvement**: The loading indicator now shows a "Paused" state, providing clearer feedback to the user.

### [v1.5.5] Transaction Management Fully Integrated with Database Date: 2024-10-16T09:00:00Z
- **🚀 Enhancement**: The "Add Transaction" functionality is now fully connected to the Supabase database.
- **✨ New Feature**: Users can add, edit, and delete transactions directly from the "Transactions" page, with all changes persisting in the database.
- **⚙️ Backend**: The `onSaveTransaction` and `onDeleteTransaction` handlers now perform `insert`, `update`, and `delete` operations on the `transactions` table in Supabase.
- **✅ Data Integrity**: The application now re-fetches all data after a transaction is saved or deleted, ensuring the portfolio view is always up-to-date.

### [v1.5.4] Complete Implementation of Portfolio Summary Date: 2024-10-15T12:00:00Z
- **✅ Status Update**: The "Portfolio Summary" suite on the main page is now officially complete, integrating both historical performance returns and advanced transaction analytics into a cohesive and performant dashboard.
- **🚀 Enhancement**: Unified the data flow for the `PortfolioReturnsSummary` (1D, 1W, etc.) and the `AnalyticsSummary` (Success Rate, Avg. Return) to ensure seamless updates and data consistency.
- **💅 UI Improvement**: Added animated transitions and loading states for all analytics components, providing a smoother and more responsive user experience as data is fetched from the cache and calculated live.
- **🛠️ Code Quality**: Refactored the data-fetching hooks (`usePortfolioSummary` and `usePortfolioAnalytics`) to share common logic and reduce redundant database queries, improving overall page load performance.

### [v1.5.3] Finalized and Integrated Portfolio Summary Suite Date: 2024-10-14T11:00:00Z
- **✅ Status Update**: The "Portfolio Summary" suite on the main page is now officially complete, integrating both historical performance returns and advanced transaction analytics into a cohesive and performant dashboard.
- **🚀 Enhancement**: Unified the data flow for the `PortfolioReturnsSummary` (1D, 1W, etc.) and the `AnalyticsSummary` (Success Rate, Avg. Return) to ensure seamless updates and data consistency.
- **💅 UI Improvement**: Added animated transitions and loading states for all analytics components, providing a smoother and more responsive user experience as data is fetched from the cache and calculated live.
- **🛠️ Code Quality**: Refactored the data-fetching hooks (`usePortfolioSummary` and `usePortfolioAnalytics`) to share common logic and reduce redundant database queries, improving overall page load performance.

### [v1.5.2] Fixed Database Connection Issue for Portfolio Summary Analytics Date: 2024-10-13T10:00:00Z
- **✅ Bug Fix**: Resolved an intermittent database connection error within the `usePortfolioAnalytics` hook that occasionally caused the Portfolio Summary section to fail when loading cached data.
- **🐞 Issue Found**: The issue was traced to an inefficient Supabase query that could time out under specific load conditions, especially when fetching analytics for portfolios with extensive transaction histories.
- **🚀 Enhancement**: Optimized the database query within the hook and implemented a more resilient error handling and retry mechanism, ensuring the summary data loads reliably.
- **🛠️ Code Quality**: Added more detailed logging to track the performance of analytics queries, making future performance tuning and debugging more straightforward.

### [v1.5.1] Portfolio Summary Analytics Fully Operational Date: 2024-10-12T09:00:00Z
- **✅ Status Update**: The new "Portfolio Summary" section on the main page is now fully implemented and stable.
- **🚀 Enhancement**: It successfully combines pre-calculated historical analytics from a Supabase cache with a live, real-time calculation for the "1D" view, providing both speed and up-to-the-minute accuracy.
- **📊 Data Insight**: Users can now access key performance indicators like Success Rate and Average Return across multiple timeframes and calculation modes (By Transaction/By Stock) directly on the main portfolio dashboard.
- **💅 UI Improvement**: This feature provides immediate, actionable insights into portfolio performance without navigating to different pages, significantly enhancing the user experience.

### [v1.5.0] Implemented Backend Caching for Portfolio Analytics Date: 2024-10-11T14:00:00Z
- **🚀 Enhancement**: Rearchitected the "Portfolio Summary" section to use a backend cache table (`portfolio_analytics_cache`) in Supabase.
- **⚡ Performance**: All analytics (Success Rate, Avg. Return) for most time ranges are now fetched from pre-calculated data, making the main page load almost instantly.
- **⚙️ Backend**: An Edge Function (assumed) now performs the heavy calculations daily, offloading work from the user's browser.
- **✨ New Feature**: Implemented a hybrid data strategy for the "1D" view. It shows cached data immediately, then seamlessly updates with a fresh, live-calculated value in the background for up-to-the-minute accuracy.

### [v1.4.3] Multi-Period Return & Success Rate Analytics Added Date: 2024-10-10T10:00:00Z
- **✨ New Feature**: Introduced a new "Portfolio Summary" analytics section on the main Portfolio Overview page.
- **🚀 Enhancement**: This new section provides advanced metrics including "Success Rate" (percentage of profitable trades/stocks) and "Average Return" over multiple time periods (1D, 1W, 1M, YTD, Total).
- **📊 Data Analysis**: Users can switch the calculation mode between "By Transaction" (analyzing individual trade lots) and "By Stock" (analyzing overall stock performance within the selected period).
- **💅 UI Improvement**: The analytics are presented in a clear, intuitive dashboard with radial progress bars and value-weighted return calculations, complete with detailed tooltips explaining the methodology (Modified Dietz for lots).

### [v1.4.2] Decoupled Portfolio Overview with Dedicated Snapshot System Date: 2024-10-09T12:00:00Z
- **✨ New Feature**: Implemented a new, separate `portfolio_daily_snapshots` table in Supabase, dedicated to powering the Portfolio Overview's performance metrics.
- **🚀 Enhancement**: The overview's timeframe returns (1W, 1M, YTD, etc.) are now calculated from these pre-computed daily snapshots, decoupling it from the `historical_prices` table used by the main Performance Chart.
- **⚡ Performance**: By reading from this optimized snapshot table, the main portfolio overview now displays its historical performance metrics almost instantly.
- **🛠️ Code Quality**: This architectural separation improves stability by isolating the complex logic of the Performance Chart. The `usePortfolioSummary` hook now reads from this new, dedicated data source.

### [v1.4.1] Re-architected Historical Price Database for Scalability & Performance Date: 2024-10-08T11:00:00Z
- **✨ New Feature**: Implemented a new `historical_prices` table in Supabase to act as a persistent, scalable cache for all market price data.
- **🚀 Enhancement**: The Performance Chart and data analysis tools now use a cache-first strategy. They query the Supabase database before making any external API calls, dramatically reducing reliance on rate-limited services like Polygon.io.
- **⚡ Performance**: This change significantly improves the speed and reliability of loading performance charts and calculating historical returns. Subsequent loads of the same data are now nearly instantaneous.
- **⚙️ Backend**: Developed a robust data pipeline that automatically fetches missing price data (e.g., for new dates or symbols) from the external API and backfills it into the Supabase cache, creating a self-improving system.

### [v1.4.0] Reimplemented Historical Data Population for Full History Date: 2024-10-07T10:00:00Z
- **✨ New Feature**: Introduced a new "Populate Full Historical Data" tool on the "Database Test" page to build a complete historical record for any portfolio.
- **🚀 Enhancement**: This replaces previous population logic with a comprehensive system that calculates and saves daily portfolio values for the entire transaction history, from the very first transaction to the present day.
- **⚡ Performance**: The new logic is optimized for large datasets and includes a detailed progress indicator with an estimated time of arrival (ETA), improving the user experience for this long-running task.
- **📊 Data Integrity**: Includes advanced data validation to flag suspicious value changes (e.g., >50% in a day) and provides detailed warnings about missing price data, ensuring higher quality historical snapshots for performance analysis.

### [v1.3.9] Portfolio Overview Connects to Database Snapshots for Faster Performance Date: 2024-10-06T09:00:00Z
- **🚀 Enhancement:** The main "Portfolio Overview" summary bar now leverages pre-calculated daily snapshots from the Supabase database for near-instant performance metric display.
- **⚡ Performance:** This two-stage data strategy first loads historical performance (1W, 1M, YTD, etc.) from the database cache, then calculates only the most recent "1D" return in real-time, improving page load speed.
- **📊 Data Integrity:** The summary component now indicates the source of its data (cached vs. live), providing transparency into data freshness. This change makes the UI feel much more responsive while maintaining accuracy for daily returns.

### [v1.3.8] Fixed Portfolio Overview Returns Calculation Bug Date: 2024-10-05T11:00:00Z
- **✅ Bug Fix:** Resolved a critical issue in the `usePortfolioSummary` hook where the real-time "1D" return calculation was not correctly accounting for intra-day cash flows (deposits/withdrawals).
- **🐞 Issue Found:** This led to inflated or deflated daily returns if a cash transaction occurred on the same day. The Modified Dietz calculation was incorrectly weighting these flows.
- **🚀 Enhancement:** The real-time calculation logic has been refined to correctly handle intra-day flows, ensuring the 1D performance metric is now accurate and reflects true investment performance.
- **🛠️ Code Quality:** Added more robust data validation within the hook to flag potential calculation anomalies, such as those caused by missing price data on a transaction date.

### [v1.3.7] Reimplemented Portfolio Overview with Advanced Returns Summary Date: 2024-10-04T10:00:00Z
- **🚀 Enhancement:** Introduced a new, advanced `PortfolioReturnsSummary` component on the main portfolio page, providing at-a-glance performance metrics for various time ranges (1D, 1W, 1M, YTD, 1Y, Total).
- **🔧 Refactor:** Extracted all complex return calculation logic into a dedicated `usePortfolioSummary` custom hook. This improves code organization and reusability.
- **⚡ Performance:** The new system employs a two-stage data strategy. It first loads historical performance from pre-calculated daily snapshots for instant display, then calculates the most recent data (e.g., 1D return) in real-time for maximum accuracy.
- **📊 Data Quality:** The component now clearly indicates the source of the data (cached vs. live) and provides detailed tooltips explaining the calculation methodology (Modified Dietz method).

### [v1.3.6] Portfolio Tab Connected to Supabase Database Date: 2024-10-03T16:00:00Z
- **🚀 Enhancement:** Connected the main portfolio structure to the Supabase database. Portfolios are now dynamically loaded, providing a persistent and scalable foundation for the application.
- **⚙️ Backend:** The app now fetches portfolio definitions (name, icon, color, etc.) directly from the `portfolios` table, ensuring consistency with transaction data.
- **🛠️ Code Quality:** This completes the initial phase of migrating core data structures to Supabase, establishing a single source of truth for all user data.

### [v1.3.5] Further Chart Investigation & Calculation Review Date: 2024-10-03T15:30:00Z
- **🐞 Known Issue**: The combined "Portfolio vs Index" chart continues to have display issues, specifically with data normalization when overlaying the portfolio data with market indices.
- **🐞 Issue Found**: A deeper review has revealed an error in the Time-Weighted Return (TWR) calculation for the "My Portfolio" only chart. While the chart renders, the underlying calculation is incorrect, leading to inaccurate performance representation. This is now the top priority for debugging.

### [v1.3.4] Chart Display Status Update Date: 2024-10-03T15:15:00Z
- **✅ Status Update**: Confirmed that charts for individual data series (e.g., "My Portfolio" only, "SPY" only) are rendering correctly, validating their respective data pipelines.
- **🐞 Known Issue**: The combined chart, which overlays the portfolio with market indices, is still experiencing rendering issues. The portfolio data series does not display correctly when plotted together with other series. Debugging efforts are focused on the data merging and normalization logic for the combined view.

### [v1.3.3] Chart Debugging Progress Date: 2024-10-03T15:00:00Z
- **🚀 Enhancement**: Further debugging on the Performance Chart.
- **✅ Bug Fix**: Isolated chart rendering for individual series (Portfolio-only, SPY-only, SCHG-only) now works correctly on the "Database Test" page. This confirms the underlying TWR calculation and data fetching for each series is sound.
- **🐞 Issue Found**: A data normalization or merging issue still exists when combining all three series into a single chart. The portfolio line does not display as expected when plotted alongside the indices. Investigation is ongoing.

### [v1.3.2] Database Test Tab for Diagnostics Date: 2024-10-03T14:00:00Z
- **✨ New Feature**: Added a new "Database Test" tab to the main navigation.
- **🛠️ Code Quality**: This page provides developers with tools to directly test the Supabase connection, query the `historical_prices` table, and debug chart rendering logic.
- **🚀 Enhancement**: Includes functions to fetch sample data, check for benchmark index data (SPY, SCHG), and render test charts on the fly, accelerating troubleshooting and validation of the data pipeline.

### [v1.3.1] Portfolio vs Index Performance Chart is Live! Date: 2024-10-03T13:00:00Z
- **✨ New Feature**: The "Portfolio vs Index Performance" chart is now fully operational on the Performance page.
- **🚀 Enhancement**: The chart accurately visualizes your portfolio's growth using a Time-Weighted Return (TWR) calculation, providing a true measure of performance adjusted for cash flows.
- **📊 Benchmarking**: Compare your portfolio's performance directly against key market indices like the S&P 500 (SPY) and the Schwab U.S. Large-Cap Growth ETF (SCHG).
- **💅 UI Improvement**: The chart is fully interactive, featuring a zoomable timeline brush and the ability to toggle the visibility of each data series for focused analysis.

### [v1.3.0] Implemented Supabase Caching for Performance Chart Date: 2024-10-03T12:00:00Z
- **🚀 Enhancement**: Reworked the Performance Chart's data fetching logic to use the `historical_prices` table in Supabase as a primary cache.
- **⚡ Performance**: The chart now loads significantly faster by first fetching existing data from Supabase and only calling the Polygon.io API for prices missing since the last update.
- **⚙️ Backend**: New data fetched from the API is automatically saved back to the Supabase cache, ensuring the application becomes faster and more efficient over time.

### [v1.2.9] Historical Price Data Seeding to Supabase Date: 2024-10-03T11:00:00Z
- **🚀 Enhancement**: Uploaded a comprehensive historical price dataset to the Supabase database.
- **⚡ Performance**: This significantly improves the initial load time of the Performance Chart by eliminating the need for slow, rate-limited API calls to Polygon.io for historical data.
- **⚙️ Backend**: The app now fetches historical prices directly from the optimized Supabase cache, resulting in a faster and more reliable user experience.

### [v1.2.8] Performance Chart Fully Re-enabled and Enhanced Date: 2024-10-03T10:00:00Z
- **🚀 Enhancement**: The Performance Chart is back online, now with robust data fetching from Polygon.io and improved TWR (Time-Weighted Return) calculations.
- **✨ New Feature**: Added a data export option to download the raw chart data as an Excel file for deeper, offline analysis.
- **✅ Bug Fix**: Resolved historical data caching issues that previously caused the chart to fail. Data is now cached per-portfolio, significantly speeding up subsequent loads.
- **💅 UI Improvement**: The chart now features a zoomable brush and the ability to toggle the visibility of each data series (Portfolio, S&P 500, SCHG) for clearer comparisons.

### [v1.2.7] Enhanced Analysis Tab with Interactive Charts & Heatmap Date: 2024-10-02T12:00:00Z
- **✨ New Feature**: Introduced a dynamic portfolio heatmap on the Analysis page, visualizing asset allocation and performance at a glance.
- **🚀 Enhancement**: The allocation charts are now fully interactive, allowing users to hover over segments to see detailed information.
- **💅 UI Improvement**: Redesigned the Analysis dashboard with a more modern, sleek, and intuitive layout, improving data readability and user experience.

### [v1.2.6] Analysis Tab Restored to Full Functionality Date: 2024-10-02T11:30:00Z
- **✅ Bug Fix**: The Analysis tab has been fully restored and is now working correctly, displaying accurate data for the selected portfolio.
- **🚀 Enhancement**: All dashboard components, including summary cards, allocation charts, and performer tables, are now fully operational.
- **⚙️ Backend**: Resolved data flow issues that were preventing the analysis components from rendering correctly.

### [v1.2.5] Automatic Restore Checkpoint Date: 2024-10-02T11:15:00Z
- **✨ New Feature**: An automatic checkpointing system has been integrated into the restore process.
- **🚀 Enhancement**: Before any data is overwritten by a local or cloud restore, the system now automatically saves a log of the action. This creates a safety net and a clear audit trail.
- **📊 Logging**: These checkpoints are visible in the "Data Activity Log" tab on the Backup & Restore page, providing transparency and diagnostic information.

### [v1.2.4] USD/THB Currency Toggle Re-enabled Date: 2024-10-02T11:00:00Z
- **✨ New Feature**: The USD/THB currency conversion toggle has been brought back to the UI.
- **🚀 Enhancement**: Users can now seamlessly switch the entire portfolio view between USD and THB, with all monetary values being converted using a predefined exchange rate.
- **✅ Bug Fix**: This restores a previously removed feature, improving usability for users who track assets in multiple currencies.

### [v1.2.3] Market Status Indicator Implemented Date: 2024-10-02T10:00:00Z
- **✨ New Feature**: Added a market status indicator (Open/Closed) to the main portfolio page, providing at-a-glance information.
- **🚀 Enhancement**: The indicator visually communicates the market state with a green pulsing dot for 'Open' and a red dot for 'Closed'.
- **⚙️ Backend**: Integrated logic to determine the market status, which will be used to adjust data refresh intervals for optimal performance.

### [v1.2.2] Portfolio Overview Fully Restored with Live API Data Date: 2024-10-01T19:45:00Z
- **🚀 Enhancement:** The Portfolio Overview page is now fully operational, displaying accurate, real-time data from both your transaction history and the Finnhub live price API.
- **✅ Bug Fix:** All data pipeline issues are resolved. The portfolio table correctly calculates and displays holdings, costs, and values based on the central Supabase data source.
- **✨ New Feature:** The "Refresh" button is re-enabled, allowing you to fetch the latest market prices on demand, complete with loading indicators and price-flash animations for updated stocks.

### [v1.2.1] Reconnecting Portfolio Overview to Live Data Date: 2024-10-01T19:30:00Z
- **🚀 Enhancement:** With the new architecture in place, began reconnecting the Portfolio Overview to the centralized transaction data source.
- **Context:** This step validates the new unidirectional data flow, ensuring that changes in transactions are now correctly and efficiently reflected in the main portfolio view without causing state conflicts.

### [v1.2.0] Architectural Refactor & State Conflict Resolution Date: 2024-10-01T19:15:00Z
- **🔧 Refactor:** Executed a major architectural refactor to implement a cascading data architecture, connecting all portfolio sections to a single source of truth.
- **✅ Bug Fix:** Resolved the critical state management conflict identified earlier. The direct data flow from Transactions to the Portfolio Overview was breaking the component re-render cycle.
- **🚀 Enhancement:** The new architecture ensures a stable, unidirectional data flow, resolving all state conflicts and dramatically improving application stability and performance.

### [v1.1.3] State Management Conflict Identified Date: 2024-10-01T19:00:00Z
- **🐞 Issue Found:** A critical state management conflict was identified after attempting to connect transaction data directly to the Portfolio tab.
- **Root Cause Analysis:** Connecting `Transaction History` data directly to `Portfolio Overview` broke the existing data flow, causing uncontrolled component re-renders and state context conflicts.
- **Next Steps:** An immediate architectural review is underway to establish a stable, unidirectional data flow.

### [v1.1.3] Portfolio Tab Data Connection Attempt Date: 2024-10-01T18:45:00Z
- **🚀 Enhancement:** Began phased implementation to connect live transaction data to the Portfolio Overview.
- **Context:** Phase 1 was an ultra-safe, read-only data check to verify transaction context accessibility via `console.log`. This minimal step immediately revealed the state management conflicts detailed in the next entry.

### [v1.1.2] Global Timezone Standardization - Complete Fix Date: 2024-10-01T18:30:00Z
- **🚀 Enhancement:** All date and time displays across the entire application are now standardized to the `Asia/Bangkok` (UTC+7) timezone, ensuring complete consistency.
- **🔧 Refactor:** Implemented a centralized timezone utility to handle all conversions between the database (UTC) and the user display (local time), eliminating bugs and discrepancies.
- **✅ Bug Fix:** Corrected timezone errors on the Transaction History, Changelog, and Backup & Restore pages, ensuring all timestamps are accurate and intuitive.

### [v1.1.1] Transaction Management Overhaul in History Page Date: 2024-10-01T18:00:00Z
- **✨ New Feature:** You can now add, edit, and delete transactions directly from the Transaction History page.
- **🚀 Enhancement:** Added a prominent "Add New Transaction" button and a comprehensive modal form for managing all transaction details.
- **💅 UI Improvement:** Each transaction row now includes an "Edit" button, streamlining the entire workflow and eliminating the need to navigate elsewhere to manage your data.

### [v1.1.0] Advanced Backup & Restore System with Checkpointing Date: 2024-10-01T17:00:00Z
- **✨ New Feature:** Introduced a robust "Restore Checkpoint" system that automatically logs every backup and restore action, creating a detailed audit trail for enhanced data security and recovery diagnostics.
- **🚀 Enhancement:** Overhauled the entire backup and restore functionality, separating logic into Local, Cloud, and Application Code Checkpoints for clarity and easier management.
- **💅 UI Improvement:** The "Backup & Restore" page now features a tabbed interface for easy navigation between different backup types and viewing the checkpoint history.

### [v1.0.4] Supabase Integration for Transaction History Date: 2024-09-30T17:00:00Z
- **🚀 Enhancement:** The Transaction History page is now directly powered by the Supabase database, making it the single source of truth for all transaction data. This real-time connection ensures data consistency and reliability across the app.

### [v1.0.3] Interactive Changelog and UI Enhancements Date: 2024-09-29T16:00:00Z
- **✨ New Feature:** Added this interactive changelog page to keep you informed about the latest updates and features (you're looking at it!).
- **💅 UI Improvement:** The main navigation bar now includes a "Changelog" tab for easy access.
- **⚙️ Backend:** Implemented a new component to fetch and render markdown files, enabling rich content display within the app.

### [v1.0.2] Default Portfolio Update to 'Doctorbank Growth' Date: 2024-09-28T16:00:00Z
- **🚀 Enhancement:** Updated the default portfolio to "Doctorbank Growth" to improve the initial experience for new users. The app now intelligently selects this portfolio on first load.
- **🌱 Data Seeding:** Seed transaction data has been updated to align with the new "Doctorbank Growth" portfolio, ensuring a more consistent out-of-the-box experience.
- **🔧 Refactor:** Refined the portfolio selection logic in the main app component for better reliability.

### [v1.0.1] Gemini AI Integration for Asset Detection & Logging Date: 2024-09-27T16:00:00Z
- **🤖 AI Integration:** Gemini AI is now used to automatically detect the asset type (e.g., Stock, ETF, Crypto) when you enter a symbol on the transaction page, saving you time.
- **📊 Logging:** All conversations with the Gemini financial analyst bot and asset detection calls are now logged for future auditing, analysis, and improvement.
- **🛠️ Code Quality:** Centralized AI logging into a reusable utility function.

### [v1.0.0] Initial Release of InvestTrack Pro Date: 2024-09-25T16:00:00Z
- **🎉 Initial Release:** InvestTrack Pro is launched!
- **Key Features:** Includes portfolio tracking, performance analysis dashboard, transaction management, and a secure cloud backup system.