export async function register() {
    const username = document.querySelector('#register-form input[name="username"]').value;
    const email = document.querySelector('#register-form input[name="email"]').value;
    const password = document.querySelector('#register-form input[name="password"]').value;
    const messageDiv = document.getElementById("message");

    try {
        const response = await fetch("/user/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, email, password }),
        });

        const responseData = await response.json();

        if (response.status === 201) {
         

            messageDiv.textContent = "User created successfully";

            setTimeout(() => {
                window.location.href = "/user/login";
            }, 2000);
        } else if (response.status === 409) {
            messageDiv.textContent = responseData.message;
        } else {
            messageDiv.textContent = "An error occurred during registration";
        }
    } catch (error) {
        console.error(error);
        messageDiv.textContent = "An error occurred during registration";
    }
}
