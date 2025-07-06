from flask import Flask, jsonify, request, session
from db_config import get_db_connection
from flask_cors import CORS  
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
app = Flask(__name__)
CORS(app)  
app.secret_key = 'secretkey'

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="admin@123",
    database="movie_recsys"
)
cursor = db.cursor(dictionary=True)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data['username']
    password = generate_password_hash(data['password'])

    try:
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, password))
        db.commit()
        return jsonify({"message": "User registered successfully"})
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']

    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        return jsonify({"message": "Login successful", "user_id": user['id']})
    else:
        return jsonify({"error": "Invalid username or password"}), 401

@app.route('/')
def home():
    return "🎬 Movie Recommender API is running!"

@app.route('/movies')
def get_movies():
    page = int(request.args.get('page', 1))
    per_page = 50
    offset = (page - 1) * per_page
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"""
        SELECT * FROM movies_full
        ORDER BY Series_Title
            LIMIT {per_page} OFFSET {offset}
    """)
    movies = cursor.fetchall()

    cursor.execute("SELECT COUNT(*) AS total FROM movies_full")
    total = cursor.fetchone()['total']

    cursor.close()
    return jsonify({
        'movies': movies,
        'total': total,
        'page': page
    })

@app.route('/search', methods=['GET'])
def search_movies():
    query = request.args.get('query', '')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM movies_full
        WHERE Series_Title LIKE %s
        LIMIT 20
    """, (f"%{query}%",))

    results = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(results)

@app.route('/recommend', methods=['GET'])
def recommend_by_id():
    movie_id = request.args.get('id')
    if not movie_id:
        return jsonify({"error": "Missing 'id' parameter"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    cursor.execute("SELECT * FROM movies_full WHERE id = %s", (movie_id,))
    movie = cursor.fetchone()

    if not movie:
        cursor.close()
        conn.close()
        return jsonify({"error": f"No movie found with id {movie_id}"}), 404

    genre = movie.get('genre')
    print("******")
    print(genre)
    print("******")
    if not genre or genre.strip() == '':
        cursor.execute("""
            SELECT * FROM movies_full
            WHERE id != %s
            ORDER BY IMDB_Rating DESC
            LIMIT 10
        """, (movie_id,))
    else:
        cursor.execute("""
            SELECT * FROM movies_full
            WHERE Genre = %s AND id != %s
            ORDER BY IMDB_Rating DESC
            LIMIT 10
        """, (genre, movie_id))

    recommendations = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify({
        "based_on": movie['series_title'],
        "recommendations": recommendations
    })

@app.route('/save_movie', methods=['POST'])
def save_movie():
    data = request.json
    user_id = data['user_id']
    movie_id = data['movie_id']

    try:
        cursor.execute("INSERT IGNORE INTO saved_movies (user_id, movie_id) VALUES (%s, %s)", (user_id, movie_id))
        db.commit()
        return jsonify({"message": "Movie saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/saved_movies', methods=['GET'])
def get_saved_movies():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.*
        FROM saved_movies s
        JOIN movies_full m ON s.movie_id = m.id
        WHERE s.user_id = %s
    """, (user_id,))
    movies = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({'movies': movies})

@app.route('/delete_saved_movie', methods=['POST'])
def delete_saved_movie():
    data = request.get_json()
    user_id = data.get('user_id')
    movie_id = data.get('movie_id')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM saved_movies WHERE user_id = %s AND movie_id = %s",
            (user_id, movie_id)
        )
        conn.commit()
        return jsonify({"message": "Movie removed from saved list."})
    except Exception as e:
        print("Error deleting saved movie:", e)
        conn.rollback()
        return jsonify({"error": "Failed to delete movie."}), 500
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    app.run(debug=True)

