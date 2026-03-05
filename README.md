# Postman App

A **Postman-like web application** built with Vue 3 and TypeScript.

Postman is a popular tool used by developers to test and interact with APIs (Application Programming Interfaces). It allows you to send HTTP requests (GET, POST, PUT, DELETE, etc.) to any server and inspect the response, without writing any code. Developers use it daily to debug APIs, explore endpoints, and organize requests into collections.

This application replicates those core features as a web client: you can create and organize HTTP requests into collections, send them to any endpoint, and view the response directly in the browser — including previews for HTML pages, images, and more.

---

## Features

- View an expandable list of HTTP requests grouped into collections via a sidebar.
- Send any HTTP request (GET, POST, PUT, DELETE, etc.) by specifying the URI, headers, body, and more.
- Display the server response with a preview depending on the content type (e.g., HTML, PNG image, JSON, etc.).
- Create new requests within a collection, and edit or delete existing ones.
- Client-side search to filter through available collections and requests.
- Export a collection to a JSON file.
- Import a collection from a JSON file.
- Handle HTTP response click events via a custom callback function passed to the component.

---

## Getting Started

### Requirements

- Node.js 22+
- npm or yarn

### Installation

Clone the repository and install dependencies:

```bash
git clone https://gitlab-edu.supsi.ch/dti-isin/roberto.guidi/didattica/info/webapp2/2024-2025/tp/Group_09_Casati_Christen_Vue.git
cd Group_09_Casati_Christen_Vue/postman-app
npm install
```

### Running the project locally

```bash
npm run dev
```

---

## Project Structure

```plaintext
src/
├── components/        # Reusable Vue components
├── api/               # API client logic (e.g., fetching collections or requests)
├── bus/               # Global event bus for communication between components
├── services/          # Global app configuration (HttpClientConfig)
├── types/             # Shared TypeScript type definitions
└── App.vue            # Root Vue component
```

---

## Authors

- **Mattia Christen**
- **Pierpaolo Casati**
