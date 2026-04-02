"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
  id: number;
  username: string;
  role: string;
};

type AdminCard = {
  href: string;
  icon: string;
  title: string;
  description: string;
};

const adminCards: AdminCard[] = [
  {
    href: "/admin/add-color",
    icon: "+",
    title: "Add Color",
    description: "Add a new nail color to your database.",
  },
  {
    href: "/admin/show-colors",
    icon: "🎨",
    title: "Show Colors",
    description: "View all colors currently stored in the database.",
  },
  {
    href: "/admin/users",
    icon: "👤",
    title: "Manage Users",
    description: "Create, review, and manage user accounts.",
  },
  {
    href: "/admin/turn-management",
    icon: "🔄",
    title: "Turn Management",
    description: "Manage daily technician check-in, service progress, and turn tracking.",
  },
  {
    href: "/admin/turn-history",
    icon: "📊",
    title: "Turn History",
    description: "Review saved turn data from previous days in the database.",
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
          credentials: "include",
        });

        const data = await res.json();

        if (!data.user) {
          router.push("/");
          return;
        }

        if (data.user.role !== "admin") {
          router.push("/");
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[28px] border border-white/70 bg-white/85 p-8 shadow-xl backdrop-blur">
            <p className="text-center text-base font-medium text-gray-500">
              Loading...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[30px] border border-white/60 bg-white/90 shadow-2xl backdrop-blur">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-600 px-6 py-8 text-white md:px-8 md:py-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                  Nail Color App
                </p>
                <h1 className="text-3xl font-bold md:text-4xl">
                  Admin Dashboard
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                  Manage colors, review your database, control user access, and
                  handle daily technician turns from one place.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-md transition hover:scale-[1.02] hover:bg-slate-100 active:scale-[0.99]"
              >
                Logout
              </button>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-green-300"></span>
              <span>
                Welcome, <span className="font-semibold">{user.username}</span>
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Choose an action
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Select one of the admin tools below to continue.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {adminCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex h-full min-h-[250px] flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-pink-300 hover:bg-pink-50 hover:shadow-xl"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-700 transition group-hover:bg-pink-100 group-hover:text-pink-600">
                    {card.icon}
                  </div>

                  <h3 className="text-xl font-semibold text-gray-800 transition group-hover:text-pink-600">
                    {card.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {card.description}
                  </p>

                  <p className="mt-auto pt-6 text-sm font-semibold text-pink-600">
                    Open page →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}