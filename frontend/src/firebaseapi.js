import { collection, getDocs, addDoc,doc,updateDoc,query,where ,getDoc,deleteDoc} from "firebase/firestore";
import { db } from "./firebase"; // Import your Firebase config
import axios from "axios";
// Function to fetch call records from Firestore
export async function fetchCallRecords() {
  const callRecords = [];
  const querySnapshot = await getDocs(collection(db, "calls")); // Ensure this is your collection name
  if (querySnapshot) {
    console.log(querySnapshot);
    querySnapshot.forEach((doc) => {
      callRecords.push({ id: doc.id, ...doc.data() });
    });
  }
  return callRecords;
}

// Function to push dummy call records to Firestore
export async function pushDummyData() {
  const dummyData2=[
//     {"eid":"EID23672","employee_phone":"2978637322","department":"Finance","cid":"CID20010","region":"Africa","customer_phone":"7030629047","status":"incoming","timestamp":"12:19 PM, 22 October 2024","duration":"1m 28s","conversation_text":"Your website keeps crashing; I can't access my account!"}
// ,{"eid":"EID17989","employee_phone":"7732393397","department":"Operations","cid":"CID07524","region":"Australia","customer_phone":"9062475508","status":"outgoing","timestamp":"2:56 PM, 22 October 2024","duration":"52m 58s","conversation_text":"I received a notification about a payment; can you explain it?"}
// ,{"eid":"EID50473","employee_phone":"0880168376","department":"Sales","cid":"CID33070","region":"Australia","customer_phone":"0525020281","status":"incoming","timestamp":"8:24 PM, 22 October 2024","duration":"31m 55s","conversation_text":"The service I received was below my expectations."}
// ,{"eid":"EID24634","employee_phone":"4220082127","department":"Marketing","cid":"CID11008","region":"Asia","customer_phone":"5367696222","status":"incoming","timestamp":"1:47 PM, 22 October 2024","duration":"7m 15s","conversation_text":"I would like to know more about your services."}
// ,{"eid":"EID37408","employee_phone":"3641800868","department":"IT","cid":"CID74540","region":"Europe","customer_phone":"1758040623","status":"outgoing","timestamp":"3:50 PM, 22 October 2024","duration":"0m 46s","conversation_text":"How do I provide feedback about my experience?"}
// ,{"eid":"EID31585","employee_phone":"1597334511","department":"HR","cid":"CID10339","region":"South America","customer_phone":"6825908167","status":"incoming","timestamp":"12:27 AM, 22 October 2024","duration":"6m 57s","conversation_text":"What are the steps to upgrade my subscription?"}

  ]
  const dummyData = [
//  {"eid":"EID23672","department":"Finance","email":"emma.martinez@workplace.net","employee_name":"Emma Martinez","password":"7rcJau4U","employee_phone":"2978637322","role":"employee"}
// ,{"eid":"EID17989","department":"Operations","email":"isabella.johnson@workplace.net","employee_name":"Isabella Johnson","password":"GrecYN61","employee_phone":"7732393397","role":"manager"}
// ,{"eid":"EID50473","department":"Sales","email":"emma.miller@company.com","employee_name":"Emma Miller","password":"yzJssZLJ","employee_phone":"0880168376","role":"employee"}
// ,{"eid":"EID24634","department":"Marketing","email":"emma.smith@company.com","employee_name":"Emma Smith","password":"krGSqlPK","employee_phone":"4220082127","role":"manager"}
// ,{"eid":"EID37408","department":"IT","email":"david.miller@business.org","employee_name":"David Miller","password":"RBYI42KZ","employee_phone":"3641800868","role":"employee"}

  ];

  const collectionRef = collection(db, "calls"); // Replace with your collection name

  try {
    for (const record of dummyData2) {
      await addDoc(collectionRef, record);
      console.log(`Added record with Call ID: ${record.cid}`);
    }
  } catch (error) {
    console.error("Error adding document: ", error);
  }
}


export async function fetchUsers() {
  const users = [];
  const querySnapshot = await getDocs(collection(db, "users")); // Ensure "users" is your collection name
  querySnapshot.forEach((doc) => {
    users.push({ eid: doc.id, ...doc.data() }); // Add document ID as eid along with user data
  });
  return users;
}



// Function to update user role by eid
export async function updateUserRole(eid, newRole) {
  try {
    // Check if the document exists by using the eid as a document ID
    const userRef = doc(db, "users", eid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // If the document exists, update it directly
      await updateDoc(userRef, { role: newRole });
      console.log(`Updated user role for ${eid} to ${newRole}`);
    } else {
      // If no document with the eid as an ID exists, try finding it as a field
      const q = query(collection(db, "users"), where("eid", "==", eid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // If a document is found, update the role
        querySnapshot.forEach(async (docSnapshot) => {
          await updateDoc(docSnapshot.ref, { role: newRole });
          console.log(`Updated user role for ${eid} to ${newRole} (by field)`);
        });
      } else {
        console.error(`No user found with eid: ${eid}`);
        throw new Error(`No user found with eid: ${eid}`);
      }
    }
  } catch (error) {
    console.error("Error updating user role: ", error);
    throw error; // Rethrow error to handle it in the calling function
  }
}




function generateRandomPassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// Helper function to generate a unique EID
function generateUniqueEid() {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `EID${randomNum}`;
}

//Mail template 
async function sendWelcomeEmail({ email, eid, password }) {
  try {
    const response = await axios.post('http://localhost:3000/send-welcome-email', {
      email,
      eid,
      password
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(response)
   
    console.log(response.data.message); // Should log "Welcome email sent!" if successful
  } catch (error) {
    console.error('Error sending email:', error);
  }
}


// Function to add a new user
export async function addUser({ employee_phone,employee_name, role,department, email }) {
  const collectionRef = collection(db, "users"); // Replace with your "users" collection name

  // Generate a unique eid and password
  const eid = generateUniqueEid();
  const password = generateRandomPassword();

  // Create the user data object
  const newUser = {
    eid,        // Auto-generated EID
    password,   // Auto-generated password
    employee_phone,      // User-provided phone number
    department,
    employee_name,
    email,// User-provided email
    role        // User-provided role (e.g., 'employee' or 'manager')
  };

  try {
    // Add the new user to the Firestore "users" collection
    await addDoc(collectionRef, newUser);
    console.log(`Added user with EID: ${eid} and password: ${password}`);

     // Send a welcome email
     await sendWelcomeEmail({ email, eid, password });

    return { eid, password }; // Return the generated credentials for the user
  } catch (error) {
    console.error("Error adding new user: ", error);
    throw error; // Rethrow error to handle it in the calling function
  }
}
export async function deleteUser(eid) {
  try {
    const userRef = doc(db, "users", eid);
    await deleteDoc(userRef);
    console.log(`Deleted user with EID: ${eid}`);
  } catch (error) {
    console.error("Error deleting user: ", error);
    throw error; // Rethrow error to handle it in the calling function
  }
}