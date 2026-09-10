# Feature Management System — Frontend

A React + Vite frontend for the Feature Management System (FMS).

## Getting Started

### Prerequisites

- Node.js 18+
- The FMS backend running (see `FeatureManagementSystem/`)

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env.local` file in the project root (already included, not committed):

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the FMS backend API | `http://127.0.0.1:8000` |

For a remote or Docker deployment, update this value to point at your backend host:

```
VITE_API_BASE_URL=https://api.your-domain.com
```

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

---

## Tech Stack

- [React 19](https://react.dev/)
- [Vite 8](https://vite.dev/)
- [MUI (Material UI) v9](https://mui.com/)
- [react-i18next](https://react.i18next.com/) — English + Hindi (हिंदी) support
- [React Router v7](https://reactrouter.com/)
- [Recharts](https://recharts.org/) — analytics charts
- [Axios](https://axios-http.com/) — HTTP client

---

## ESLint

```bash
npm run lint
```

For production applications, TypeScript with type-aware lint rules is recommended.
See the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts)
and [`typescript-eslint`](https://typescript-eslint.io/).
