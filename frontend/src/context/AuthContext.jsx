import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore"; // Import necessary Firestore functions
import Cookies from "js-cookie"; // Import js-cookie


const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const navigate = useNavigate();

    const login = async (eid, password) => {
        setLoading(true);
        setError('');
        try {
            // Create a query to find the user document with the specified EID
            const userQuery = query(collection(db, 'users'), where('eid', '==', eid));
            const querySnapshot = await getDocs(userQuery);
            // Check if the query returned any documents
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data(); // Get the first document's data

                // Check if provided password matches the stored password
                if (userData.password === password) {
                    // Set the user state and mark as authenticated
                    setUser({
                        eid: userData.eid,
                        role: userData.role,
                        phone: userData.phone || userData.employee_phone,
                        cids: userData.cids,
                        name: userData.name || userData.employee_name,
                        employee_name: userData.employee_name,
                    });
                    setIsAuthenticated(true);
                    
                    // Set a cookie for the user
                    Cookies.set('userEid', `${userData.eid}-${userData.password}`, { expires: 7 }); // Cookie expires in 7 days
                } else {
                    setError('Incorrect password');
                }
            } else {
                console.error('No user found with the specified EID.');
                setError('EID not found');
            }
        } catch (err) {
            console.error('Error during login:', err.message);
            setError('Error during login: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Function to handle logout
    const logout = async () => {
        setLoading(true);
        await signOut(auth);
        setUser(null);
        setIsAuthenticated(false); // Set authentication to false after logout
        
        // Remove the cookie on logout
        Cookies.remove('userEid'); 
        setLoading(false);
    };

    // Check if the user is authenticated on initial load
     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true); // Set loading while checking auth state

            // Check if userEid cookie exists
            const userEidCookie = Cookies.get("userEid");

            if (userEidCookie) {
                const [eid, password] = userEidCookie.split("-"); // Extract EID and password

                try {
                    // Query Firestore to find the employee document
                    const userQuery = query(collection(db, "users"), where("eid", "==", eid));
                    const querySnapshot = await getDocs(userQuery);

                    if (!querySnapshot.empty) {
                        const userData = querySnapshot.docs[0].data();

                        // Check if the password matches
                        if (userData.password === password) {
                            // Set user details and authentication state
                            setUser({ eid: userData.eid, ...userData });
                            setIsAuthenticated(true);
                        } else {
                            console.warn("Password mismatch for EID:", eid);
                            handleLogout();
                        }
                    } else {
                        console.warn("User document not found for EID:", eid);
                        handleLogout(); // Log out if EID not found in the DB
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error.message);
                    setError(`Error fetching user data: ${error.message}`);
                    handleLogout(); // Log out in case of error
                }
            } else {
                setUser(null);
                setIsAuthenticated(false);
                navigate("/login");
            }

            setLoading(false); // Stop loading after checks
        });

        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    // Handle logout, remove cookies and redirect to login
    const handleLogout = () => {
        Cookies.remove("userEid"); // Remove the user cookie
        setUser(null);
        setIsAuthenticated(false);
        navigate("/login"); // Redirect to login page
    };

    const value = {
        user,
        login,
        logout,
        loading,
        error,
        isAuthenticated,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
