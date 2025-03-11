# Novara ChatApp

Novara ChatApp is a real-time chat application built with **ReactJS, Express, Socket.IO, and MongoDB**. It enables users to send instant messages, and experience seamless communication with real-time updates.

##Note

🚧 This project is still under development and will be improved in the future. 🚀

## Features
- 🔥 **Real-time Messaging** with Socket.IO
- 🔐 **User Authentication** (Login & Signup)
- 💾 **MongoDB Database** for storing messages & user data
- 🎨 **Responsive UI** built with ReactJS

## Tech Stack
- **Frontend:** ReactJS
- **Backend:** Node.js, Express.js
- **Real-time Communication:** Socket.IO
- **Database:** MongoDB
- **Database:** JWT

## Installation
### Prerequisites
Ensure you have **Node.js** and **MongoDB** installed.

### Steps to Run Locally
1. **Clone the repository:**
   ```bash
   git clone https://github.com/MinHiuLe/Novara-ChatApp.git
   cd novara-chatapp
   ```
2. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   cd ../api
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env` file in the `backend` directory with:
     ```env
     MONGO_URI=your_mongodb_connection_string
     JWT_SECRET=your_secret_key
     FRONTEND_URL=http://localhost:3000
     ```
4. **Start the servers:**
   - **Backend:**
     ```bash
     cd backend
     npm start
     ```
   - **Frontend:**
     ```bash
     cd frontend
     npm start
     ```
5. **Access the app:** Open `http://localhost:3000` in your browser or `https://novara-mu.vercel.app/` in Vercel

## Screenshots
![image](https://github.com/user-attachments/assets/d8b5bfaa-5914-4c04-8779-10b00af79c80)

## Contributing
Feel free to submit pull requests or report issues. Contributions are welcome! 🚀

## License
This project is licensed under the MIT License.

## Contact
For any inquiries, please contact us via email: lmhieu0204@gmail.com

