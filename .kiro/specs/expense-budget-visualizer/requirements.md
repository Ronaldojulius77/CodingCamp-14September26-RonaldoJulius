# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize spending, and visualize their budget distribution through interactive charts. The application runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted in the browser Local Storage. No backend server, build toolchain, or complex setup is required.

---

## Glossary

- **App**: The Expense and Budget Visualizer single-page web application.
- **Transaction**: A single expense record consisting of an item name, a monetary amount, a category, and a recorded date/time.
- **Transaction_List**: The scrollable display of all recorded transactions.
- **Input_Form**: The UI form used to create new transactions.
- **Category**: A label that classifies a transaction (e.g., Food, Transport, Fun, or a user-defined custom category).
- **Balance_Display**: The summary widget at the top of the App showing the total amount of all transactions.
- **Pie_Chart**: The visual chart that shows spending distribution across categories.
- **Local_Storage**: The browser built-in Web Storage API (localStorage) used for client-side data persistence.
- **Category_Manager**: The component responsible for managing the list of available categories (built-in and custom).
- **Monthly_Summary**: A filtered view of transactions restricted to a single calendar month.
- **Theme_Toggle**: The UI control that switches the App between dark and light visual themes.
- **Validator**: The component responsible for validating form input before a transaction is created.

---

## Requirements

---

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in an item name, amount, and category and submit them as a new transaction, so that I can record my expenses quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL display a text field for item name (maximum 100 characters), a numeric field for amount, and a dropdown for category selection that contains at least one selectable category option.
2. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name field is not empty, the amount field contains a numeric value between 0.01 and 999999999.99, and a category is selected.
3. IF the Validator detects that the item name field is empty, THEN THE Input_Form SHALL display an inline error message adjacent to the item name field and SHALL NOT create a transaction.
4. IF the Validator detects that the amount field is empty, non-numeric, or outside the valid range, THEN THE Input_Form SHALL display an inline error message adjacent to the amount field and SHALL NOT create a transaction.
5. IF the Validator detects that no category is selected, THEN THE Input_Form SHALL display an inline error message adjacent to the category dropdown and SHALL NOT create a transaction.
6. WHEN all fields pass validation and the user submits the Input_Form, THE App SHALL create a new Transaction storing the item name, amount, category, and current date/time, and add it to the Transaction_List.
7. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state within 500 milliseconds of submission.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions, so that I can review my spending history at a glance.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored Transaction with its item name (up to 100 characters), amount (formatted to 2 decimal places), and category visible.
2. WHILE the number of transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL remain vertically scrollable with no maximum transaction count limit enforced by the display.
3. THE Transaction_List SHALL display transactions in reverse-chronological order based on the date and time the transaction was recorded, with the most recently added transaction appearing first.
4. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Local_Storage, and THE Transaction_List SHALL reflect the removal without requiring a page reload.
5. IF the delete operation fails to remove the Transaction from Local_Storage, THEN THE App SHALL display an error message indicating the deletion failed and retain the Transaction in the Transaction_List.
6. WHEN no transactions exist, THE Transaction_List SHALL display an empty-state message indicating that no transactions have been recorded.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see the total of all my recorded expenses at the top of the page, so that I always know my current spending total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of the amounts of all stored Transactions, displayed as a numeric value rounded to 2 decimal places.
2. WHEN a new Transaction is added, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the reduced total without requiring a page reload.
4. WHEN a Transaction amount is edited, THE Balance_Display SHALL update to reflect the recalculated total without requiring a page reload.
5. WHEN no Transactions exist, THE Balance_Display SHALL show a total of 0.00.

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going visually.

#### Acceptance Criteria

1. THE Pie_Chart SHALL render a segment for each Category that has at least one Transaction with a positive spending amount, sized proportionally to that Category percentage share of total spending.
2. WHEN a new Transaction is added, THE Pie_Chart SHALL update to reflect the new spending distribution without requiring a page reload.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update to reflect the revised spending distribution without requiring a page reload.
4. THE Pie_Chart SHALL display a legend that maps each color segment to its corresponding Category name and that Category percentage share of total spending rounded to one decimal place.
5. WHEN no transactions exist, THE Pie_Chart SHALL display a placeholder state indicating that no spending data is available, replacing the chart and legend.
6. IF two or more Categories are displayed, THEN THE Pie_Chart SHALL assign a visually distinguishable color to each segment so that no two adjacent segments share the same color.

---

### Requirement 5: Data Persistence via Local Storage

**User Story:** As a user, I want my transactions to be saved automatically, so that my data is still available after I close and reopen the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL write the complete Transaction_List to Local_Storage.
2. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction_List to Local_Storage.
3. WHEN the App loads in the browser, THE App SHALL read all previously stored Transactions from Local_Storage, populate the Transaction_List with the stored entries, and recalculate the Balance_Display and Pie_Chart from the loaded Transaction_List.
4. IF Local_Storage is unavailable, returns a parse error, or contains a value that is not a valid Transaction_List array on load, THEN THE App SHALL initialize with an empty Transaction_List and SHALL display a warning message that is visible to the user without blocking or replacing the main application interface.

---

### Requirement 6: Built-in Categories

**User Story:** As a user, I want a pre-defined set of expense categories to be available by default, so that I can start recording transactions immediately without any setup.

#### Acceptance Criteria

1. THE Input_Form SHALL include at least the following built-in categories in the category dropdown: Food, Transport, and Fun.
2. WHEN the App loads for the first time, THE App SHALL display all built-in categories in the category dropdown without requiring any prior user action or configuration.
3. IF a built-in category is not selected by the user, THEN THE Input_Form SHALL preserve all built-in categories in the dropdown without removing or modifying them.

---

### Requirement 7: Custom Categories

**User Story:** As a user, I want to create my own expense categories, so that I can tailor the tracker to my specific spending habits.

#### Acceptance Criteria

1. THE Category_Manager SHALL provide a UI control that allows the user to enter and save a new custom category name of up to 50 characters.
2. WHEN the user saves a custom category, THE Validator SHALL verify that the category name is not empty and does not duplicate an existing category name (case-insensitive comparison).
3. IF the Validator detects an invalid or duplicate category name, THEN THE Category_Manager SHALL display an inline error message adjacent to the input field and SHALL NOT save the category; THE error message SHALL be dismissed when the user modifies the input field.
4. WHEN a custom category is successfully saved, THE Category_Manager SHALL add it to the category dropdown in the Input_Form within 500 milliseconds.
5. WHEN the App loads, THE App SHALL restore all previously saved custom categories from Local_Storage so that they are available in the Input_Form.
6. IF Local_Storage is unavailable or returns an error when saving a custom category, THEN THE Category_Manager SHALL display an error message informing the user that the category could not be saved.

---

### Requirement 8: Monthly Summary View

**User Story:** As a user, I want to filter my transactions by calendar month, so that I can review and analyze my spending for a specific period.

#### Acceptance Criteria

1. THE Monthly_Summary SHALL provide a month/year selector control that allows the user to choose a target month within the range from the earliest recorded transaction month/year to the current calendar month.
2. WHEN the user selects a target month, THE Monthly_Summary SHALL display only the Transactions whose recorded date falls within that calendar month and year.
3. WHEN the user selects a target month, THE Balance_Display SHALL show the sum of amounts (rounded to 2 decimal places) for only the filtered Transactions.
4. WHEN the user selects a target month, THE Pie_Chart SHALL update to show spending distribution for only the filtered Transactions that have a positive spending amount.
5. WHEN the user activates the clear filter control, THE App SHALL revert the Transaction_List, Balance_Display, and Pie_Chart to show all Transactions.
6. WHEN the user selects a target month that contains no Transactions, THE Monthly_Summary SHALL display the empty-state message in the Transaction_List, show 0.00 in the Balance_Display, and display the no-data placeholder in the Pie_Chart.

---

### Requirement 9: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between a dark and a light visual theme, so that I can use the App comfortably in different lighting environments.

#### Acceptance Criteria

1. THE Theme_Toggle SHALL provide a control that displays the currently active theme (dark or light) and allows the user to switch between the two themes.
2. WHEN the user activates the Theme_Toggle, THE App SHALL apply the selected theme to all UI components, including backgrounds, text, inputs, and chart elements, within 100 milliseconds, without a page reload.
3. WHEN the user activates the Theme_Toggle, THE App SHALL persist the selected theme preference to Local_Storage.
4. WHEN the App loads, THE App SHALL read the stored theme preference from Local_Storage and apply it before displaying any visible content, so that the wrong theme is never visible to the user.
5. IF no stored theme preference exists, THEN THE App SHALL apply the light theme as the default.

---

### Requirement 10: Technology and Project Structure Constraints

**User Story:** As a developer, I want the project to use only HTML, CSS, and Vanilla JavaScript with a defined folder structure, so that the codebase remains simple, maintainable, and requires no build tools.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no frontend frameworks or libraries except exactly one charting library (Chart.js) loaded via CDN for the Pie Chart feature.
2. THE App SHALL require no backend server to function; all logic and data SHALL be stored client-side using the browser localStorage API with no cookies, sessionStorage, or remote data calls.
3. THE App SHALL include exactly one CSS file located inside a css directory.
4. THE App SHALL include exactly one JavaScript file located inside a js directory.
5. THE App SHALL load and render all features in current stable releases of Chrome, Firefox, Edge, and Safari with no JavaScript errors in the browser console and no requirement for polyfills or transpilation.

---

### Requirement 11: Performance and Responsiveness

**User Story:** As a user, I want the App to load quickly and respond to my interactions without noticeable delay, so that using it feels smooth and efficient.

#### Acceptance Criteria

1. WHEN the App is loaded over a local file system or a simple static file server, THE App SHALL render the full initial UI within 2 seconds on a standard desktop browser, where full initial UI means all visible components (Transaction_List, Balance_Display, and Pie_Chart) are rendered and interactive.
2. WHEN the user adds or deletes a Transaction, THE App SHALL update the Transaction_List, Balance_Display, and Pie_Chart within 100 milliseconds of the user action completing.
3. THE App SHALL maintain a responsive layout that displays all UI components without horizontal scrolling, overlapping elements, or clipped content on viewport widths between 320px and 1920px.
4. WHEN the Transaction_List contains between 1 and 1000 entries, THE App SHALL render the full Transaction_List without truncation, pagination, or visible rendering delay beyond 100 milliseconds.
