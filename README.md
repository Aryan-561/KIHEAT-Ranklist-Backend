# KIHEAT Ranklist (Backend)

This is the backend service for the **KIHEAT Ranklist** dashboard — a dynamic system to manage and display student academic rankings based on batch, semester, and program.

It provides a RESTful API built with **Express.js**, connected to **MongoDB**, and designed to work seamlessly with the [KIHEAT Ranklist Frontend](https://github.com/Aryan-561/KIHEAT-Ranklist-Frontend).

---

## 🛠️ Tech Stack

- **Node.js**  
- **Express.js**  
- **MongoDB** (via Mongoose)  
- **Dotenv**
- [ParserSenpai](https://github.com/martian0x80/Parser-Senpai/)
- **Nodemon** (for development)

---

## 📄 PDF Parsing with Parser-Senpai
This project uses [parser-senpai](https://github.com/martian0x80/Parser-Senpai), to extract and structure academic data from a result pdf.
It convert PDF result data into json structure data.

<img width="1275" height="571" border="2" alt="image" src="https://github.com/user-attachments/assets/80b4b25d-7e5a-40cd-a0f8-350e37e72624" />

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Aryan-561/KIHEAT-Ranklist-Backend.git
cd KIHEAT-Ranklist-Backend
```
### 2. Install dependencies

```bash
npm install
```
### 3. Setup environment variables
Create a .env file in the root:

env
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/kiheat-ranklist
```

### 4. Run the app
```
npm run dev
```

---

## 🙌 Authors
- ### [Aryan](https://github.com/Aryan-561)
- ### [Himanshu Tamoli](https://github.com/HimanshuTamoli24) 
