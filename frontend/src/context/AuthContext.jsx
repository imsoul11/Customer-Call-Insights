import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie"; // Import js-cookie
import { fetchBackendUsers } from "../lib/backendData";


const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const buildSessionUser = (userData = {}) => ({
    eid: userData.eid,
    role: userData.role,
    phone: userData.phone || userData.employee_phone,
    cids: userData.cids,
    name: userData.name || userData.employee_name,
    employee_name: userData.employee_name,
    employee_phone: userData.employee_phone,
    email: userData.email,
});

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
            const users = await fetchBackendUsers();
            const normalizedEid = eid.trim();
            const userData = users.find((entry) => entry.eid === normalizedEid);

            if (userData) {
                if (userData.password === password) {
                    setUser(buildSessionUser(userData));
                    setIsAuthenticated(true);
                    
                    Cookies.set('userEid', `${userData.eid}-${userData.password}`, { expires: 7 }); // Cookie expires in 7 days
                } else {
                    setError('Incorrect password');
                }
            } else {
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
        handleLogout();
        setLoading(false);
    };

    // Check if the user is authenticated on initial load
     useEffect(() => {
        const restoreSession = async () => {
            setLoading(true); // Set loading while checking auth state

            const userEidCookie = Cookies.get("userEid");

            if (userEidCookie) {
                const separatorIndex = userEidCookie.indexOf("-");
                const eid = separatorIndex === -1 ? userEidCookie : userEidCookie.slice(0, separatorIndex);
                const password = separatorIndex === -1 ? "" : userEidCookie.slice(separatorIndex + 1);

                try {
                    const users = await fetchBackendUsers();
                    const userData = users.find((entry) => entry.eid === eid);

                    if (userData) {
                        if (userData.password === password) {
                            setUser(buildSessionUser(userData));
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
        };

        restoreSession();
    }, [navigate]);

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
