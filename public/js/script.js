 const API_URL = "http://localhost:5500";

const sections = {
    login: document.getElementById('loginSection'),
    signup: document.getElementById('signupSection'),
    report: document.getElementById('reportSection'),
    admin: document.getElementById('adminDashboard'),
    userDisplay: document.getElementById('userDisplay'),
    logoutBtn: document.getElementById('logoutBtn')
};

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function showSection(sectionId) {
    Object.values(sections).forEach(section => {
        section?.classList.add('hidden');
    });
    document.getElementById(sectionId)?.classList.remove('hidden');
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (token && user) {
       
        sections.login.classList.add('hidden');
        sections.signup.classList.add('hidden');
        
        sections.userDisplay.textContent = `Welcome, ${user.username}`;
        sections.userDisplay.classList.remove('hidden');
        sections.logoutBtn.classList.remove('hidden');

        if (user.isAdmin) {
            showSection('adminDashboard');
            fetchReports();
        } else {
            showSection('reportSection');
        }
    } else {
        showSection('loginSection');
    }
}

function setupEventListeners() {
    document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            username: document.getElementById('signupName').value,
            email: document.getElementById('signupEmail').value,
            password: document.getElementById('signupPassword').value
        };

        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                alert('Signup successful! Please login.');
                showSection('loginSection');
            } else {
                alert(data.message || 'Signup failed');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        }
    });

    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        };

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                alert('Login successful!');
                checkAuth();
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        }
    });
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.reload();
    });

    document.getElementById('reportForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('issueType', document.getElementById('issueType').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('location', document.getElementById('location').value);
        
        const imageFile = document.getElementById('imageUpload').files[0];
        if (imageFile) formData.append('image', imageFile);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/report`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                alert('Issue reported successfully!');
                e.target.reset();
                document.getElementById('imagePreview').classList.add('hidden');
            } else {
                alert(data.message || 'Failed to submit report');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        }
    });

    document.getElementById('imageUpload')?.addEventListener('change', function(e) {
        const preview = document.getElementById('imagePreview');
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('previewImage').src = e.target.result;
                preview.classList.remove('hidden');
            }
            reader.readAsDataURL(this.files[0]);
        } else {
            preview.classList.add('hidden');
        }
    });
}

async function fetchReports() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const reports = await response.json();
            renderReports(reports);
        } else {
            console.error('Failed to fetch reports');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderReports(reports) {
    const reportList = document.getElementById('reportList');
    reportList.innerHTML = '';

    if (reports.length === 0) {
        reportList.innerHTML = '<li>No reports found</li>';
        return;
    }

    reports.forEach(report => {
        const li = document.createElement('li');
        li.innerHTML = `
            <h3>${report.issueType}</h3>
            <p>${report.description}</p>
            <p><strong>Location:</strong> ${report.location}</p>
            <p><strong>Status:</strong> ${report.status}</p>
            ${report.image ? `<img src="${API_URL}/uploads/${report.image}" alt="Issue Image" width="200">` : ''}
        `;
        reportList.appendChild(li);
    });
} 