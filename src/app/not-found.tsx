import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <h1 className="text-9xl font-extrabold text-gray-300">404</h1>

        <h2 className="mt-4 text-3xl font-semibold text-gray-800">
          Page Not Found
        </h2>

        <p className="mt-2 text-gray-600">
          Sorry, the page you’re looking for doesn’t exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 bg-primary text-white rounded-lg shadow hover:bg-primary/90 transition-all"
        >
          ⬅ Return Home
        </Link>
      </div>

      <div className="mt-10">
        <svg
          className="mx-auto w-64 opacity-80"
          viewBox="0 0 500 500"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="250" cy="250" r="200" fill="#e5e7eb" />
          <circle cx="200" cy="230" r="20" fill="#9ca3af" />
          <circle cx="300" cy="230" r="20" fill="#9ca3af" />
          <path
            d="M180 310 Q250 360 320 310"
            stroke="#9ca3af"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
