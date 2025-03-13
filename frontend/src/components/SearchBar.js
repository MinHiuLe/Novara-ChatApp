import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";

const SearchBar = ({ token, baseUrl }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  // Fetch API khi query thay đổi
  const fetchUsers = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.get(`${baseUrl}/api/users/search`, {
        params: { q: searchQuery },
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [token, baseUrl]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(query), 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, fetchUsers]);

  // Memoized search results
  const searchResults = useMemo(() => {
    if (loading) return <p>Search...</p>;
    if (results.length > 0) {
      return (
        <ul>
          {results.map(({ _id, username, fullName }) => (
            <li key={_id}>
              {username} {fullName ? `(${fullName})` : ""}
            </li>
          ))}
        </ul>
      );
    }
    return query ? <p>No users found</p> : null;
  }, [results, loading, query]);

  return (
    <div style={{ padding: "10px" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />
      {searchResults}
    </div>
  );
};

export default SearchBar;
