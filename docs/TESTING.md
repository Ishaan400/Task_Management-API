# API Testing Guide with Postman

## Setup

1. Create a new Postman Collection named "Task Management System"
2. Set up environment variables in Postman:
   - `BASE_URL`: `http://localhost:5000/api`
   - `TOKEN`: Empty (will be filled after login)

## Test Sequence

### 1. User Authentication

#### 1.1 Register Admin User
```http
POST {{BASE_URL}}/users/register
Content-Type: application/json

{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
}
```
Expected Response: 201 Created with user details and token

#### 1.2 Register Manager User
```http
POST {{BASE_URL}}/users/register
Content-Type: application/json

{
    "name": "Manager User",
    "email": "manager@example.com",
    "password": "manager123",
    "role": "manager"
}
```

#### 1.3 Register Regular User
```http
POST {{BASE_URL}}/users/register
Content-Type: application/json

{
    "name": "Regular User",
    "email": "user@example.com",
    "password": "user123",
    "role": "user"
}
```

#### 1.4 Login (Test with each user)
```http
POST {{BASE_URL}}/users/login
Content-Type: application/json

{
    "email": "admin@example.com",
    "password": "admin123"
}
```
- Save the returned token to Postman environment variable `TOKEN`
- Create a request preset with Authorization header:
  ```
  Authorization: Bearer {{TOKEN}}
  ```

### 2. Task Management (Use Admin Token)

#### 2.1 Create Tasks
```http
POST {{BASE_URL}}/tasks
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
    "title": "Main Task",
    "description": "This is the main task",
    "status": "pending",
    "assignedTo": "{{USER_ID}}",
    "deadline": "2024-12-31T00:00:00.000Z",
    "tags": ["important", "frontend"],
    "estimatedHours": 8
}
```
- Create multiple tasks
- Save task IDs for testing dependencies

#### 2.2 Create Task with Dependencies
```http
POST {{BASE_URL}}/tasks
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
    "title": "Dependent Task",
    "description": "This task depends on the main task",
    "status": "pending",
    "assignedTo": "{{USER_ID}}",
    "deadline": "2024-12-31T00:00:00.000Z",
    "dependencies": ["{{TASK_ID}}"],
    "estimatedHours": 4
}
```

#### 2.3 Get Tasks List with Filters
```http
GET {{BASE_URL}}/tasks?status=pending&priority=3&page=1&limit=10&sortBy=priority&sortOrder=desc
Authorization: Bearer {{TOKEN}}
```

#### 2.4 Get Single Task
```http
GET {{BASE_URL}}/tasks/{{TASK_ID}}
Authorization: Bearer {{TOKEN}}
```

#### 2.5 Update Task
```http
PUT {{BASE_URL}}/tasks/{{TASK_ID}}
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
    "status": "in-progress",
    "completionPercentage": 50,
    "actualHours": 4
}
```

#### 2.6 Bulk Update Tasks
```http
POST {{BASE_URL}}/tasks/bulk-update
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
    "tasks": [
        {
            "_id": "{{TASK_ID_1}}",
            "status": "completed",
            "completionPercentage": 100
        },
        {
            "_id": "{{TASK_ID_2}}",
            "status": "in-progress",
            "completionPercentage": 75
        }
    ]
}
```

#### 2.7 Delete Task
```http
DELETE {{BASE_URL}}/tasks/{{TASK_ID}}
Authorization: Bearer {{TOKEN}}
```

### 3. Role-Based Access Testing

1. Switch to Manager Token:
   - Test task creation (should succeed)
   - Test task deletion (should fail)

2. Switch to Regular User Token:
   - Test task creation (should fail)
   - Test task viewing (should succeed)
   - Test task update (should fail)

### 4. Edge Cases Testing

#### 4.1 Task Dependencies
```http
PUT {{BASE_URL}}/tasks/{{DEPENDENT_TASK_ID}}
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
    "status": "completed"
}
```
Expected: 400 Bad Request (dependencies not completed)

#### 4.2 Invalid Task Status
```http
POST {{BASE_URL}}/tasks
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
    "title": "Test Task",
    "description": "Description",
    "status": "invalid-status",
    "assignedTo": "{{USER_ID}}",
    "deadline": "2024-12-31"
}
```
Expected: 400 Bad Request

#### 4.3 Missing Required Fields
```http
POST {{BASE_URL}}/tasks
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
    "title": "Test Task"
}
```
Expected: 400 Bad Request

## Test Data Cleanup

After testing, clean up the test data:
1. Delete all test tasks
2. Note: User accounts cannot be deleted through API (by design)

## Common Issues and Solutions

1. Authentication Errors:
   - Check if token is properly set in environment
   - Verify token hasn't expired (re-login if needed)

2. Permission Errors:
   - Verify user role matches required permissions
   - Check if correct token is being used

3. Task Dependencies:
   - Ensure dependent tasks exist
   - Verify dependency chain is valid
   - Check completion status of dependencies

## Automated Testing Setup

1. Create a Postman Collection Runner sequence:
   - User registration and login
   - Task creation
   - Task updates
   - Task deletion

2. Set up test scripts for each request:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has required fields", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('_id');
    pm.expect(response).to.have.property('title');
});
```