 const API_URL = "http://localhost:5500";

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token')) {
        window.location.href = '/';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.isAdmin) {
        window.location.href = '/';
        return;
    }

    loadAdminData();
});

async function loadAdminData() {
    try {
        const token = localStorage.getItem('token');
        
        const reportsResponse = await fetch(`${API_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (reportsResponse.ok) {
            const reports = await reportsResponse.json();
            updateReportsTable(reports);
            updateStats(reports);
        }

        setupAdminListeners();
    } catch (error) {
        console.error('Admin dashboard error:', error);
    }
}

function updateReportsTable(reports) {
    const tbody = document.getElementById('issues-list');
    tbody.innerHTML = '';

    reports.forEach(report => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${report.issueType}</td>
            <td>
                <select class="status-select" data-id="${report._id}">
                    <option value="Pending" ${report.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Resolved" ${report.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                </select>
            </td>
            <td>${report.location}</td>
            <td>
                <input type="text" class="assigned-input" data-id="${report._id}" value="${report.assignedTo || ''}">
            </td>
            <td>${new Date(report.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn-update" data-id="${report._id}">Update</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats(reports) {
    document.getElementById('total-count').textContent = reports.length;
    document.getElementById('pending-count').textContent = reports.filter(r => r.status === 'Pending').length;
    document.getElementById('priority-count').textContent = reports.filter(r => r.issueType === 'Emergency').length;
    document.getElementById('resolved-count').textContent = reports.filter(r => r.status === 'Resolved').length;
}

function setupAdminListeners() {
    document.addEventListener('change', '.status-select', (e) => {
        if (e.target.classList.contains('status-select')) {
            const reportId = e.target.dataset.id;
            const status = e.target.value;
            updateReport(reportId, { status });
        }
    });

    document.addEventListener('blur', '.assigned-input', (e) => {
        if (e.target.classList.contains('assigned-input')) {
            const reportId = e.target.dataset.id;
            const assignedTo = e.target.value;
            updateReport(reportId, { assignedTo });
        }
    });

    document.addEventListener('click', '.btn-update', (e) => {
        if (e.target.classList.contains('btn-update')) {
            const reportId = e.target.dataset.id;
            const row = e.target.closest('tr');
            const status = row.querySelector('.status-select').value;
            const assignedTo = row.querySelector('.assigned-input').value;
            updateReport(reportId, { status, assignedTo });
        }
    });

    document.getElementById('export-btn')?.addEventListener('click', exportReports);
}

async function updateReport(id, updates) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Report updated:', data);
            loadAdminData(); 
        }
    } catch (error) {
        console.error('Update error:', error);
    }
}

async function exportReports() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'reports_export.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        }
    } catch (error) {
        console.error('Export error:', error);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
        localStorage.clear();
        window.location.href = '/';
    }
});

function updateReportsTable(reports) {
    const tbody = document.getElementById('issues-list');
    tbody.innerHTML = '';

    const departments = [
        'Road Maintenance',
        'Public Works',
        'Sanitation',
        'Utilities',
        'Parks & Recreation'
    ];

    reports.forEach(report => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${report.issueType}</td>
            <td>
                <select class="status-select" data-id="${report._id}">
                    <option value="Pending" ${report.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Resolved" ${report.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                </select>
            </td>
            <td>${report.location}</td>
            <td class="department-cell">
                ${departments.map(dept => `
                    <button class="dept-btn ${report.assignedTo === dept ? 'active' : ''}" 
                            data-id="${report._id}" 
                            data-dept="${dept}">
                        ${dept.split(' ')[0]}
                    </button>
                `).join('')}
            </td>
            <td>${new Date(report.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn-update" data-id="${report._id}">Update</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

 