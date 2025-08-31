// Test script to verify delete functionality
// Run this in the browser console while on the admin page

async function testDeleteBook() {
  // First, let's check if we can get books
  try {
    const response = await fetch('/api/catalog/books');
    const books = await response.json();
    console.log('Available books:', books);
    
    if (books.length === 0) {
      console.log('No books available to delete');
      return;
    }
    
    // Try to delete the first book
    const bookToDelete = books[0];
    console.log('Attempting to delete book:', bookToDelete);
    
    const deleteResponse = await fetch(`/api/catalog/books/${bookToDelete.book_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('librotrack_token')}` // Admin token
      }
    });
    
    console.log('Delete response status:', deleteResponse.status);
    const deleteResult = await deleteResponse.text();
    console.log('Delete response:', deleteResult);
    
    if (deleteResponse.ok) {
      console.log('✅ Delete successful!');
    } else {
      console.log('❌ Delete failed:', deleteResult);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testDeleteBook();
