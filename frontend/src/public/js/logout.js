export async function logout() {

  const messageDiv = document.getElementById('message');
  
  try {

    const response = await fetch('/user/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // include cookies in the logout
    });

    if (response.status === 200) {

      localStorage.removeItem('userName');
      localStorage.removeItem('user_id');

      messageDiv.textContent = 'User logged in successfully';

      setTimeout(()=>{
        location.href='/';
      },1000);
      
    } else {
      
      const responseData = await response.json();
      messageDiv.textContent = responseData.message;
    }
  } catch (error) {
    console.error(error);
    alert('An error occurred during logout');
  }
}