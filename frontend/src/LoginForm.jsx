import { useState } from 'react';
import './LoginForm.css';


function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint = isRegistering
      ? 'http://localhost:5000/register'
      : 'http://localhost:5000/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log('Auth response:', data);

      if (res.ok) {
        localStorage.setItem('userId', data.user_id);
        onLogin(data.user_id, username);
      } else {
        alert(data.error || (isRegistering ? 'Registration failed.' : 'Login failed.'));
      }
    } catch (err) {
      console.error(err);
      alert(isRegistering ? 'Registration error.' : 'Login error.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-form">
        <h2>{isRegistering ? 'Register' : 'Login'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          /><br />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          /><br />
          <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
        </form>

        <p>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Login here' : 'Register here'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;

