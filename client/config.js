export const BACKEND_URL = process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "http://askmypdf-api.eba-faytbgvt.us-east-1.elasticbeanstalk.com/"