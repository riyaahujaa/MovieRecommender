import { useState, useEffect } from 'react';
import './App.css';
import LoginForm from './LoginForm';

function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

function App() {
  const [movies, setMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [basedOn, setBasedOn] = useState('');
  const [compactView, setCompactView] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [savedMovies, setSavedMovies] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const perPage = 50;

  useEffect(() => {
    if (searchQuery.trim() === '') {
      fetchMovies();
      return;
    }

    const debouncedSearch = debounce(() => {
      fetch(`http://localhost:5000/search?query=${searchQuery}`)
        .then(res => res.json())
        .then(data => {
          setMovies(data);
          setIsSearching(true);
        })
        .catch(err => {
          console.error('Search failed:', err);
          setError('Search failed');
        });
    }, 300);

    debouncedSearch();
  }, [searchQuery]);

  const fetchMovies = () => {
    fetch(`http://localhost:5000/movies?page=${page}&per_page=${perPage}`)
      .then(res => res.json())
      .then(data => {
        setMovies(data.movies);
        setTotal(data.total);
        setIsSearching(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load movie list.');
      });
  };

  useEffect(() => {
    if (!isSearching) fetchMovies();
  }, [page]);

  useEffect(() => {
    if (userId) {
      fetchSavedMovies();
    }
  }, [userId]);

  const fetchSavedMovies = async () => {
    try {
      const res = await fetch(`http://localhost:5000/saved_movies?user_id=${userId}`);
      const data = await res.json();
      setSavedMovies(data.movies || []);
    } catch (err) {
      console.error('Failed to fetch saved movies:', err);
    }
  };

  const handlePosterClick = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/recommend?id=${id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setRecommendations([]);
        return;
      }

      setRecommendations(data.recommendations);
      setBasedOn(data.based_on);
      setError('');
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to fetch recommendations.');
      setRecommendations([]);
    }
  };

  const handleSaveMovie = async (movieId) => {
    try {
      const res = await fetch(`http://localhost:5000/save_movie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, movie_id: movieId }),
      });

      if (!res.ok) throw new Error('Failed to save movie');
      const saved = await res.json();
      alert(saved.message || 'Movie saved!');
      fetchSavedMovies();
    } catch (err) {
      console.error(err);
      alert('Could not save the movie.');
    }
  };

  const handleDeleteSavedMovie = async (movieId) => {
    try {
      const res = await fetch(`http://localhost:5000/delete_saved_movie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, movie_id: movieId }),
      });
  
      if (!res.ok) throw new Error('Failed to delete movie');
      const data = await res.json();
      alert(data.message || 'Movie deleted!');
      fetchSavedMovies(); // Refresh saved movies
    } catch (err) {
      console.error(err);
      alert('Could not delete the movie.');
    }
  };
  

  const handleLogout = () => {
    setUserId(null);
    setUsername('');
    setRecommendations([]);
    setSavedMovies([]);
    setShowSaved(false);
    setSearchQuery('');
  };

  return (
    <div className="container">
      <h1 className="fancy-heading">🎬 Movie Recommender<span className="cursor">|</span></h1>

      {userId && (
        <div className="top-right-buttons">
          <span className="username-label">👤 {username}</span>
          <button onClick={handleLogout}>🚪 Logout</button>
          <button onClick={handleLogout}>🔄 Change User</button>
        </div>
      )}

      {!userId ? (
        <LoginForm
          onLogin={(id, name) => {
            setUserId(id);
            setUsername(name);
          }}
        />
      ) : (
        <>
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Live search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>❌ Clear</button>
            )}
          </div>

          <button onClick={() => setShowSaved(prev => !prev)}>
            {showSaved ? '🔽 Hide Saved Movies' : '💾 Show Saved Movies'}
          </button>

          <button onClick={() => setCompactView(prev => !prev)}>
            Toggle View: {compactView ? 'Compact' : 'Expanded'}
          </button>

          {error && <p className="error">{error}</p>}

          {showSaved && (
            <>
              <h2>Your Saved Movies</h2>
              {savedMovies.length === 0 ? (
                <p>You haven’t saved any movies yet.</p>
              ) : (
                <div className="grid compact">
                  {savedMovies.map((movie, index) => (
                    <div className="card" key={`saved-${index}`}>
                      <img src={movie.poster_link} alt={movie.series_title} />
                      <h3>{movie.series_title}</h3>
                      <button onClick={() => handleDeleteSavedMovie(movie.id)}>❌ Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {recommendations.length === 0 ? (
            <>
              {!searchQuery && <p>Select a movie to get recommendations:</p>}
              <div className={`grid ${compactView ? 'compact' : 'expanded'}`}>
                {movies.map((movie) => (
                  <div className="card" key={movie.id}>
                    <div className="card-content" onClick={() => handlePosterClick(movie.id)}>
                      <img src={movie.poster_link} alt={movie.series_title} />
                      <h3>{movie.series_title}</h3>
                      <div className="tooltip">
                        {movie.series_title} — ⭐ {movie.imdb_rating}
                      </div>
                    </div>
                    <button onClick={() => handleSaveMovie(movie.id)}>💾 Save</button>
                  </div>
                ))}
              </div>

              {!isSearching && (
                <div className="pagination">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    ⬅️ Prev
                  </button>
                  <span>Page {page}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * perPage >= total}>
                    Next ➡️
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2>Recommended Movies based on: {basedOn}</h2>
              <button onClick={() => setRecommendations([])}>🔙 Back</button>
              <div className="grid expanded">
                {recommendations.map((movie, index) => (
                  <div className="card" key={index}>
                    <img src={movie.poster_link} alt={movie.series_title} />
                    <h3>{movie.series_title}</h3>
                    <p>⭐ {movie.imdb_rating}</p>
                    <p>{movie.overview}</p>
                    <button onClick={() => handleSaveMovie(movie.id)}>💾 Save</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
