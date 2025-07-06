document.addEventListener('DOMContentLoaded', function() {
            // Set current year in footer
            document.getElementById('current-year').textContent = new Date().getFullYear();
            
            // Load expenses from localStorage
            loadExpenses();
            
            // Initialize charts
            initCharts();
            
            // Set default date to today
            document.getElementById('date').valueAsDate = new Date();
        });

        // Application state
        let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        let currentEditIndex = null;
        let selectedCurrency = localStorage.getItem('currency') || 'USD';
        let chart, monthlyChart;

        // DOM elements
        const form = document.getElementById("expense-form");
        const tableBody = document.getElementById("expense-table-body");
        const emptyState = document.getElementById("empty-state");
        const totalExpenseEl = document.getElementById("total-expense-amount");
        const monthlyExpenseEl = document.getElementById("monthly-expense");
        const topCategoryEl = document.getElementById("top-category");
        const recordsCountEl = document.getElementById("records-count");
        const chartCtx = document.getElementById("expense-chart");
        const monthlyCtx = document.getElementById("monthly-chart");
        const themeToggle = document.getElementById("theme-toggle");
        const currencySelector = document.getElementById("currency");
        const cancelEditBtn = document.getElementById("cancel-edit");
        const submitBtn = document.getElementById("submit-btn");

        // Currency formatting
        const currencyFormats = {
            'USD': { symbol: '$', locale: 'en-US' },
            'EUR': { symbol: '€', locale: 'de-DE' },
            'GBP': { symbol: '£', locale: 'en-GB' },
            'INR': { symbol: '₹', locale: 'en-IN' },
            'JPY': { symbol: '¥', locale: 'ja-JP' }
        };

        function formatCurrency(amount) {
            const format = currencyFormats[selectedCurrency];
            return new Intl.NumberFormat(format.locale, {
                style: 'currency',
                currency: selectedCurrency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        }

        // Update currency symbol in input fields
        function updateCurrencySymbols() {
            document.querySelectorAll('.currency-symbol').forEach(el => {
                el.textContent = currencyFormats[selectedCurrency].symbol;
            });
        }

        // Initialize charts
        function initCharts() {
            // Main expense chart (pie/doughnut)
            chart = new Chart(chartCtx, {
                type: 'doughnut',
                data: { labels: [], datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(139, 92, 246, 0.7)',
                        'rgba(244, 63, 94, 0.7)',
                        'rgba(20, 184, 166, 0.7)',
                        'rgba(249, 115, 22, 0.7)',
                        'rgba(236, 72, 153, 0.7)',
                    ],
                    borderWidth: 1
                }]},
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

            // Monthly trend chart (line)
            monthlyChart = new Chart(monthlyCtx, {
                type: 'line',
                data: { labels: [], datasets: [{
                    label: 'Monthly Expenses',
                    data: [],
                    fill: false,
                    borderColor: 'rgba(59, 130, 246, 0.7)',
                    tension: 0.1
                }]},
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Update charts with current data
        function updateCharts() {
            // Update main chart (by category)
            const categoryData = {};
            expenses.forEach(expense => {
                categoryData[expense.category] = (categoryData[expense.category] || 0) + expense.amount;
            });

            chart.data.labels = Object.keys(categoryData);
            chart.data.datasets[0].data = Object.values(categoryData);
            chart.update();

            // Update monthly trend chart
            const monthlyData = {};
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            expenses.forEach(expense => {
                const date = new Date(expense.date);
                const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                monthlyData[monthYear] = (monthlyData[monthYear] || 0) + expense.amount;
            });

            // Sort months chronologically
            const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
                const [monthA, yearA] = a.split(' ');
                const [monthB, yearB] = b.split(' ');
                const monthIndexA = monthNames.indexOf(monthA);
                const monthIndexB = monthNames.indexOf(monthB);
                return new Date(yearA, monthIndexA) - new Date(yearB, monthIndexB);
            });

            monthlyChart.data.labels = sortedMonths;
            monthlyChart.data.datasets[0].data = sortedMonths.map(month => monthlyData[month]);
            monthlyChart.update();
        }

        // Update statistics
        function updateStats() {
            // Total expenses
            const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
            totalExpenseEl.textContent = formatCurrency(total);

            // Monthly expenses (current month)
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyTotal = expenses.reduce((sum, expense) => {
                const expenseDate = new Date(expense.date);
                if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
                    return sum + expense.amount;
                }
                return sum;
            }, 0);
            monthlyExpenseEl.textContent = formatCurrency(monthlyTotal);

            // Top category
            const categoryTotals = {};
            expenses.forEach(expense => {
                categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
            });
            
            let topCategory = '-';
            let maxAmount = 0;
            for (const [category, amount] of Object.entries(categoryTotals)) {
                if (amount > maxAmount) {
                    maxAmount = amount;
                    topCategory = category;
                }
            }
            topCategoryEl.textContent = topCategory;

            // Records count
            recordsCountEl.textContent = `${expenses.length} ${expenses.length === 1 ? 'record' : 'records'}`;
        }

        // Update the expenses table
        function updateTable(data = expenses) {
            if (data.length === 0) {
                tableBody.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }
            
            emptyState.classList.add('hidden');
            tableBody.innerHTML = '';
            
            data.forEach((expense, index) => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 smooth-transition fade-in';
                row.innerHTML = `
                    <td class="p-3">${formatDate(expense.date)}</td>
                    <td class="p-3">
                        <span class="px-2 py-1 rounded-full text-xs font-medium 
                            ${getCategoryColorClass(expense.category)}">
                            ${expense.category}
                        </span>
                    </td>
                    <td class="p-3 font-medium">${formatCurrency(expense.amount)}</td>
                    <td class="p-3 text-gray-600 dark:text-gray-300">${expense.description || '-'}</td>
                    <td class="p-3 text-right">
                        <button onclick="editExpense(${index})" class="mr-2 text-blue-500 hover:text-blue-700 smooth-transition">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteExpense(${index})" class="text-red-500 hover:text-red-700 smooth-transition">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            updateStats();
            updateCharts();
            saveExpenses();
        }

        // Format date for display
        function formatDate(dateString) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        }

        // Get color class for category badge
        function getCategoryColorClass(category) {
            const colors = {
                'Food': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                'Transportation': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                'Housing': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
                'Utilities': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                'Healthcare': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                'Entertainment': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
                'Education': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
                'Shopping': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
                'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            };
            return colors[category] || colors['Other'];
        }

        // Edit expense
        window.editExpense = function(index) {
            const expense = expenses[index];
            document.getElementById("date").value = expense.date;
            document.getElementById("category").value = expense.category;
            document.getElementById("amount").value = expense.amount;
            document.getElementById("description").value = expense.description || '';
            
            currentEditIndex = index;
            cancelEditBtn.classList.remove('hidden');
            submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Update Expense';
            
            // Scroll to form
            document.getElementById("expense-form").scrollIntoView({ behavior: 'smooth' });
        };

        // Cancel edit
        cancelEditBtn.onclick = function() {
            form.reset();
            document.getElementById("date").valueAsDate = new Date();
            currentEditIndex = null;
            cancelEditBtn.classList.add('hidden');
            submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Save Expense';
        };

        // Delete expense
        window.deleteExpense = function(index) {
            if (confirm('Are you sure you want to delete this expense?')) {
                expenses.splice(index, 1);
                updateTable();
                
                // If we're editing this expense, cancel edit
                if (currentEditIndex === index) {
                    cancelEditBtn.click();
                } else if (currentEditIndex > index) {
                    currentEditIndex--;
                }
            }
        };

        // Form submission
        form.onsubmit = function(e) {
            e.preventDefault();
            
            const date = document.getElementById("date").value;
            const category = document.getElementById("category").value;
            const amount = parseFloat(document.getElementById("amount").value);
            const description = document.getElementById("description").value;
            
            if (!date || !category || isNaN(amount) || amount <= 0) {
                alert('Please fill all required fields with valid values');
                return;
            }
            
            const expense = { date, category, amount, description };
            
            if (currentEditIndex !== null) {
                // Update existing expense
                expenses[currentEditIndex] = expense;
                currentEditIndex = null;
                cancelEditBtn.classList.add('hidden');
                submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Save Expense';
            } else {
                // Add new expense
                expenses.push(expense);
            }
            
            form.reset();
            document.getElementById("date").valueAsDate = new Date();
            updateTable();
        };

        // Filter by category
        document.getElementById("filter-category").onchange = function() {
            const category = this.value;
            if (!category) return updateTable();
            
            const filtered = expenses.filter(expense => expense.category === category);
            updateTable(filtered);
        };

        // Search expenses
        document.getElementById("search-input").oninput = function() {
            const query = this.value.toLowerCase();
            const filtered = expenses.filter(expense => 
                expense.description.toLowerCase().includes(query) || 
                expense.category.toLowerCase().includes(query) ||
                expense.amount.toString().includes(query) ||
                formatDate(expense.date).toLowerCase().includes(query)
            );
            updateTable(filtered);
        };

        // Sorting functions
        document.getElementById("sort-date-asc").onclick = function() {
            expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
            updateTable();
        };
        
        document.getElementById("sort-date-desc").onclick = function() {
            expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            updateTable();
        };
        
        document.getElementById("sort-amount-asc").onclick = function() {
            expenses.sort((a, b) => a.amount - b.amount);
            updateTable();
        };
        
        document.getElementById("sort-amount-desc").onclick = function() {
            expenses.sort((a, b) => b.amount - a.amount);
            updateTable();
        };

        // Delete all expenses
        document.getElementById("delete-all").onclick = function() {
            if (expenses.length === 0) {
                alert('No expenses to delete');
                return;
            }
            
            if (confirm('Are you sure you want to delete ALL expenses? This cannot be undone.')) {
                expenses = [];
                updateTable();
                
                // If editing, cancel edit
                if (currentEditIndex !== null) {
                    cancelEditBtn.click();
                }
            }
        };

        // Export to CSV
        document.getElementById("export-csv").onclick = function() {
            if (expenses.length === 0) {
                alert('No expenses to export');
                return;
            }
            
            const headers = ['Date', 'Category', 'Amount', 'Description'];
            const csvRows = [
                headers.join(','),
                ...expenses.map(expense => 
                    `${expense.date},"${expense.category}",${expense.amount},"${expense.description || ''}"`
                )
            ];
            
            const csv = csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // Currency change
        currencySelector.value = selectedCurrency;
        currencySelector.onchange = function() {
            selectedCurrency = this.value;
            localStorage.setItem('currency', selectedCurrency);
            updateCurrencySymbols();
            updateTable();
        };
        updateCurrencySymbols();

        // Theme toggle
        themeToggle.onclick = function() {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            
            // Update charts for theme change
            updateCharts();
        };

        // Check for saved theme preference
        if (localStorage.getItem('theme') === 'dark' || 
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }

        // Save expenses to localStorage
        function saveExpenses() {
            localStorage.setItem('expenses', JSON.stringify(expenses));
        }

        // Load expenses from localStorage
        function loadExpenses() {
            const savedExpenses = localStorage.getItem('expenses');
            if (savedExpenses) {
                expenses = JSON.parse(savedExpenses);
                updateTable();
            }
        }