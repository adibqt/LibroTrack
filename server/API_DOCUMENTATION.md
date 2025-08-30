---


## Authentication & User Management

### Register User

- **POST** `/api/auth/register`

#### Request Body


```json
{
  "username": "testuser",
  "password": "testpass",
  "first_name": "Test",
  "last_name": "User",
  "email": "test@example.com",
  "user_type": "MEMBER"
}
```

#### Response

```json
{ "user_id": 1 }
```

#### Use Case

Register a new user (member or admin).

---

### Login

- **POST** `/api/auth/login`

#### Request Body

```json
{
  "username": "johndoe",
  "password": "yourpassword"
}
```

#### Response

```json
{ "token": "<jwt_token>" }
```

#### Use Case

Authenticate a user and receive a JWT token for subsequent requests.

---

### Get Current User

- **GET** `/api/auth/me`

#### Headers

`Authorization: Bearer <jwt_token>`

#### Response

```json
{
  "user_id": 1,
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "user_type": "MEMBER",
  "status": "ACTIVE",
  "created_at": "2025-08-30T12:34:56.000Z"
}
```

#### Use Case

Get the profile of the currently authenticated user.

---

### Get User by ID

- **GET** `/api/auth/users/{id}`

#### Headers

`Authorization: Bearer <jwt_token>`

#### Response

```json
{
  "user_id": 2,
  "username": "janedoe",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "user_type": "MEMBER",
  "status": "ACTIVE",
  "created_at": "2025-08-30T12:34:56.000Z"
}
```

#### Use Case

Get the profile of a user by their ID.

---

### Update User

- **PATCH** `/api/auth/users/{id}`

#### Headers

`Authorization: Bearer <jwt_token>`

#### Request Body

```json
{
  "username": "newname",
  "first_name": "New",
  "last_name": "Name",
  "email": "newemail@example.com",
  "user_type": "MEMBER",
  "status": "ACTIVE"
}
```

#### Response

```json
{ "message": "User updated" }
```

#### Use Case

Update a user's profile or status.

---

### Can User Issue Books

- **GET** `/api/auth/users/{id}/can-issue`

#### Headers

`Authorization: Bearer <jwt_token>`

#### Response

```json
{ "can_issue": true }
```

#### Use Case

Check if a user is eligible to issue books (i.e., has ACTIVE status).

---

## Reservations

### Create Reservation

- **POST** `/api/reservations`

#### Request Body

```json
{
  "user_id": 1,
  "book_id": 2,
  "expiry_days": 7,
  "priority_level": 1
}
```

#### Response

```json
{ "reservation_id": 10 }
```

#### Use Case

Reserve a book for a user, optionally specifying expiry and priority.

---

### Cancel Reservation

- **POST** `/api/reservations/{id}/cancel`

#### Response

```json
{ "message": "Reservation cancelled" }
```

#### Use Case

Cancel an active reservation.

---

### Fulfill Reservation

- **POST** `/api/reservations/{id}/fulfill`

#### Response

```json
{ "message": "Reservation fulfilled" }
```

#### Use Case

Mark a reservation as fulfilled (e.g., when the book is picked up).

---

### Expire Reservations (Manual)

- **POST** `/api/reservations/expire/run`

#### Response

```json
{ "message": "Expired reservations processed" }
```

#### Use Case

Manually trigger expiration of overdue reservations.

---

## Loans

### Issue a Book (Checkout)

- **POST** `/api/loans`

#### Request Body

```json
{
  "user_id": 1,
  "book_id": 2,
  "due_days": 14
}
```

#### Response

```json
{ "loan_id": 5 }
```

#### Use Case

Issue a book to a user (checkout/borrow).

---

### Return a Book (Checkin)

- **POST** `/api/loans/{id}/return`

#### Response

```json
{ "message": "Book returned" }
```

#### Use Case

Return a borrowed book (checkin).

# LibroTrack API Documentation

This document describes all available API endpoints for the LibroTrack project, including sample requests and responses, use cases, and notes.

---

## Authentication

> **Note:** Some endpoints (e.g., book creation, update, author assignment) are for admin use only. Implement authentication/authorization as needed.

---

## Categories

### Create Category

- **POST** `/api/categories`

#### Request Body

```json
{
  "category_name": "Science Fiction",
  "description": "Books about futuristic science and technology."
}
```

#### Response

```json
{
  "category_id": 1,
  "category_name": "Science Fiction",
  "description": "Books about futuristic science and technology."
}
```

#### Use Case

Add a new book category to the system.

---

### Get All Categories

- **GET** `/api/categories`

#### Response

```json
[
  {
    "category_id": 1,
    "category_name": "Science Fiction",
    "description": "..."
  },
  { "category_id": 2, "category_name": "History", "description": "..." }
]
```

#### Use Case

List all available book categories.

---

### Get Category by ID

- **GET** `/api/categories/{id}`

#### Response

```json
{ "category_id": 1, "category_name": "Science Fiction", "description": "..." }
```

#### Use Case

Fetch details of a specific category.

---

### Update Category

- **PUT** `/api/categories/{id}`

#### Request Body

```json
{
  "category_name": "Sci-Fi",
  "description": "Updated description."
}
```

#### Response

```json
{ "message": "Category updated" }
```

#### Use Case

Edit a category's name or description.

---

### Delete Category

- **DELETE** `/api/categories/{id}`

#### Response

```json
{ "message": "Category deleted" }
```

#### Use Case

Remove a category from the system.

---

## Authors

### Create Author

- **POST** `/api/authors`

#### Request Body

```json
{
  "first_name": "Isaac",
  "last_name": "Asimov"
}
```

#### Response

```json
{
  "author_id": 1,
  "first_name": "Isaac",
  "last_name": "Asimov"
}
```

#### Use Case

Add a new author.

---

### Get All Authors

- **GET** `/api/authors`

#### Response

```json
[
  { "author_id": 1, "first_name": "Isaac", "last_name": "Asimov" },
  { "author_id": 2, "first_name": "Arthur", "last_name": "Clarke" }
]
```

#### Use Case

List all authors.

---

### Get Author by ID

- **GET** `/api/authors/{id}`

#### Response

```json
{ "author_id": 1, "first_name": "Isaac", "last_name": "Asimov" }
```

#### Use Case

Fetch details of a specific author.

---

### Update Author

- **PUT** `/api/authors/{id}`

#### Request Body

```json
{
  "first_name": "I.",
  "last_name": "Asimov"
}
```

#### Response

```json
{ "message": "Author updated" }
```

#### Use Case

Edit an author's details.

---

### Delete Author

- **DELETE** `/api/authors/{id}`

#### Response

```json
{ "message": "Author deleted" }
```

#### Use Case

Remove an author from the system.

---

## Catalog & Stock

### Search/List Books

- **GET** `/api/catalog/books?title=&author=&category=`

#### Query Params

- `title` (optional)
- `author` (optional)
- `category` (optional)

#### Response

```json
[
  {
    "book_id": 1,
    "title": "1984",
    "isbn": "9780451524935",
    "category_name": "Science Fiction",
    "available_copies": 3,
    "total_copies": 5
  }
]
```

#### Use Case

Search for books by title, author, or category.

---

### Get Book Details

- **GET** `/api/catalog/books/{bookId}`

#### Response

```json
{
  "book_id": 1,
  "isbn": "9780451524935",
  "title": "1984",
  "category_id": 1,
  "publication_year": 1949,
  "publisher": "Secker & Warburg",
  "language": "English",
  "description": "Dystopian novel...",
  "location_shelf": "A1",
  "total_copies": 5,
  "available_copies": 3,
  "reserved_copies": 1,
  "status": "AVAILABLE"
}
```

#### Use Case

Get all details for a specific book.

---

### Get Book Availability

- **GET** `/api/catalog/books/{bookId}/availability`

#### Response

```json
{
  "available_copies": 3,
  "reserved_copies": 1,
  "total_copies": 5
}
```

#### Use Case

Check how many copies of a book are available or reserved.

---

### Get Low Stock Books

- **GET** `/api/catalog/stock/low`

#### Response

```json
[
  {
    "book_id": 2,
    "title": "Brave New World",
    "available_copies": 1,
    "total_copies": 5
  }
]
```

#### Use Case

Monitor books with low available stock for restocking.

---

### Create Book (Admin)

- **POST** `/api/catalog/books`

#### Request Body

```json
{
  "isbn": "9780451524935",
  "title": "1984",
  "category_id": 1,
  "publication_year": 1949,
  "publisher": "Secker & Warburg",
  "language": "English",
  "description": "Dystopian novel...",
  "location_shelf": "A1",
  "total_copies": 5
}
```

#### Response

```json
{ "book_id": 1 }
```

#### Use Case

Add a new book to the catalog.

---

### Update Book (Admin)

- **PUT** `/api/catalog/books/{bookId}`

#### Request Body

```json
{
  "isbn": "9780451524935",
  "title": "1984",
  "category_id": 1,
  "publication_year": 1949,
  "publisher": "Secker & Warburg",
  "language": "English",
  "description": "Updated description...",
  "location_shelf": "A1",
  "total_copies": 5,
  "status": "AVAILABLE"
}
```

#### Response

```json
{ "message": "Book updated" }
```

#### Use Case

Edit book details in the catalog.

---

### List Authors for a Book

- **GET** `/api/catalog/books/{bookId}/authors`

#### Response

```json
[
  { "author_id": 1, "first_name": "Isaac", "last_name": "Asimov" },
  { "author_id": 2, "first_name": "Arthur", "last_name": "Clarke" }
]
```

#### Use Case

Get all authors for a specific book.

---

### List Books for an Author

- **GET** `/api/authors/{authorId}/books`

#### Response

```json
[
  {
    "book_id": 1,
    "title": "1984",
    "isbn": "9780451524935",
    "category_id": 1,
    "publication_year": 1949,
    "publisher": "Secker & Warburg",
    "language": "English",
    "status": "AVAILABLE"
  }
]
```

#### Use Case

Get all books written by a specific author.

---

### Add Author to Book (Admin)

- **POST** `/api/catalog/books/{bookId}/authors/{authorId}`

#### Response

```json
{ "message": "Author added to book" }
```

#### Use Case

Assign an author to a book.

---

### Remove Author from Book (Admin)

- **DELETE** `/api/catalog/books/{bookId}/authors/{authorId}`

#### Response

```json
{ "message": "Author removed from book" }
```

#### Use Case

Remove an author from a book.

---

## Error Responses

All endpoints return errors in the following format:

```json
{ "error": "Error message here" }
```

---

## Notes

- All endpoints return JSON.
- Admin endpoints should be protected in production.
- Use appropriate HTTP status codes (201 for created, 404 for not found, 500 for server errors, etc).
- For more details on request/response fields, see the database schema and PL/SQL package documentation.
