const { test, expect } = require('@playwright/test');

const PASSWORD = 'TestPass123!';

const roleCases = [
  {
    name: 'employee',
    loginPath: '/login',
    expectedPath: '/employee/dashboard',
    marker: 'Personal Action Summary',
    buttonName: /^login$/i,
    emailLabel: /work email/i,
    profile: {
      email: 'employee.e2e@test.com',
      full_name: 'Employee E2E',
      role: 'TeamMember',
      employee_id: 'EMP90001',
    },
  },
  {
    name: 'team leader',
    loginPath: '/login',
    expectedPath: '/leader/dashboard',
    marker: 'Leadership Workspace',
    buttonName: /^login$/i,
    emailLabel: /work email/i,
    profile: {
      email: 'leader.e2e@test.com',
      full_name: 'Leader E2E',
      role: 'TeamLeader',
      employee_id: 'EMP90002',
    },
  },
  {
    name: 'hr manager',
    loginPath: '/login',
    expectedPath: '/hr/dashboard',
    marker: 'HR operations',
    buttonName: /^login$/i,
    emailLabel: /work email/i,
    profile: {
      email: 'hr.e2e@test.com',
      full_name: 'HR E2E',
      role: 'HRManager',
      employee_id: 'EMP90003',
    },
  },
  {
    name: 'admin',
    loginPath: '/login',
    expectedPath: '/admin/dashboard',
    marker: 'Admin Control Center',
    buttonName: /^login$/i,
    emailLabel: /work email/i,
    profile: {
      email: 'admin.e2e@test.com',
      full_name: 'Admin E2E',
      role: 'Admin',
      employee_id: 'EMP90004',
    },
  },
  {
    name: 'candidate',
    loginPath: '/candidate/login',
    expectedPath: '/candidate/dashboard',
    marker: 'Candidate Command Center',
    buttonName: /^login$/i,
    emailLabel: /email address/i,
    profile: {
      email: 'candidate.e2e@test.com',
      full_name: 'Candidate E2E',
      role: 'Candidate',
      employee_id: null,
    },
  },
];

const installApiMock = async (page, profile) => {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith('/api/auth/login/') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'e2e-access-token',
          refresh: 'e2e-refresh-token',
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          employee_id: profile.employee_id,
        }),
      });
      return;
    }

    if (path.endsWith('/api/auth/me/') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profile),
      });
      return;
    }

    if (path.endsWith('/api/auth/token/refresh/') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access: 'e2e-refreshed-access-token' }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
};

const expectedPathForRole = (role) => {
  if (role === 'Candidate') return '/candidate/dashboard';
  if (role === 'TeamLeader') return '/leader/dashboard';
  if (role === 'HRManager') return '/hr/dashboard';
  if (role === 'Admin') return '/admin/dashboard';
  return '/employee/dashboard';
};

const signIn = async (page, profile, loginPath, emailLabel, buttonName) => {
  await installApiMock(page, profile);
  await page.goto(loginPath);

  await page.getByLabel(emailLabel).fill(profile.email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: buttonName }).click();

  await expect(page).toHaveURL(new RegExp(`${expectedPathForRole(profile.role)}$`));
};

for (const roleCase of roleCases) {
  test(`${roleCase.name} can sign in and reach the correct workspace`, async ({ page }) => {
    await signIn(page, roleCase.profile, roleCase.loginPath, roleCase.emailLabel, roleCase.buttonName);
    await expect(page.locator('body')).toContainText(roleCase.marker);
  });
}

test('team member is redirected away from HR routes', async ({ page }) => {
  const profile = roleCases[0].profile;
  await installApiMock(page, profile);

  await page.goto('/login');
  await page.getByLabel(/work email/i).fill(profile.email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /^login$/i }).click();

  await expect(page).toHaveURL(/\/employee\/dashboard$/);

  await page.goto('/hr/dashboard');
  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByText('403')).toBeVisible();
});