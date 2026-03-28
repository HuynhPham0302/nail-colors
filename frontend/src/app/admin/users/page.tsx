"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
    id: number;
    username: string;
    role: string;
};

type UserItem = {
    id: number;
    username: string;
    role: string;
    is_active: boolean;
};

export default function AdminUsersPage() {
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [users, setUsers] = useState<UserItem[]>([]);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("staff");
    const [message, setMessage] = useState("");

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
                credentials: "include",
            });

            const data = await res.json();

            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
            setUsers([]);
        }
    };

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

                setCurrentUser(data.user);
                await fetchUsers();
            } catch (error) {
                console.error("Auth check failed:", error);
                router.push("/");
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    const handleAddUser = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/add-user`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                    role,
                }),
            });

            const data = await res.json();

            if (data.message !== "User added successfully") {
                setMessage(data.message || "Failed to add user");
                return;
            }

            setMessage("User added successfully");
            setUsername("");
            setPassword("");
            setRole("staff");
            fetchUsers();
        } catch (error) {
            console.error("Failed to add user:", error);
            setMessage("Cannot connect to server");
        }
    };

    const handleDeleteUser = async (userId: number) => {
        const confirmed = window.confirm("Are you sure you want to delete this user?");
        if (!confirmed) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.detail || data.message || "Failed to delete user");
                return;
            }

            setUsers((prev) => prev.filter((user) => user.id !== userId));
        } catch (error) {
            console.error("Failed to delete user:", error);
            alert("Cannot connect to server");
        }
    };

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

    if (!currentUser) return null;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-6 md:py-12">
            <div className="mx-auto max-w-6xl">
                <div className="overflow-hidden rounded-[28px] md:rounded-[30px] border border-white/60 bg-white/90 shadow-2xl backdrop-blur">
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-600 px-5 py-7 text-white sm:px-6 md:px-8 md:py-10">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="mb-2 text-xs sm:text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                                    Nail Color App
                                </p>
                                <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">
                                    Manage Users
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                                    Create user accounts, review existing users, and manage access from one page.
                                </p>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="inline-flex w-full sm:w-fit items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-md transition hover:scale-[1.02] hover:bg-slate-100 active:scale-[0.99]"
                            >
                                Logout
                            </button>
                        </div>

                        <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                            <span className="h-2.5 w-2.5 rounded-full bg-green-300"></span>
                            <span className="truncate">
                                Welcome, <span className="font-semibold">{currentUser.username}</span>
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[380px_minmax(0,1fr)] md:p-8">
                        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
                            <div className="mb-5">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    Add User
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Create a new account for staff or admin access.
                                </p>
                            </div>

                            <form className="space-y-4" onSubmit={handleAddUser}>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter username"
                                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Role
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                                    >
                                        <option value="staff">staff</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] hover:from-pink-600 hover:to-rose-600 active:scale-[0.99]"
                                >
                                    Add User
                                </button>

                                {message && (
                                    <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 break-words">
                                        {message}
                                    </p>
                                )}
                            </form>
                        </section>

                        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
                            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">
                                        User List
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Review all users currently in the system.
                                    </p>
                                </div>

                                <div className="inline-flex w-fit items-center rounded-full bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-600">
                                    {users.length} user{users.length !== 1 ? "s" : ""}
                                </div>
                            </div>

                            {users.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                    No users found.
                                </div>
                            ) : (
                                <>
                                    <div className="hidden md:block overflow-hidden rounded-3xl border border-gray-200 bg-white">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full">
                                                <thead className="border-b border-gray-200 bg-gray-50">
                                                    <tr>
                                                        <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                            ID
                                                        </th>
                                                        <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Username
                                                        </th>
                                                        <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Role
                                                        </th>
                                                        <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Active
                                                        </th>
                                                        <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Action
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {users.map((user) => (
                                                        <tr
                                                            key={user.id}
                                                            className="border-b border-gray-100 transition hover:bg-pink-50/40 last:border-b-0"
                                                        >
                                                            <td className="px-5 py-4 text-sm font-medium text-gray-700">
                                                                {user.id}
                                                            </td>

                                                            <td className="px-5 py-4 text-sm text-gray-800">
                                                                {user.username}
                                                            </td>

                                                            <td className="px-5 py-4 text-sm text-gray-800">
                                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                                                    {user.role}
                                                                </span>
                                                            </td>

                                                            <td className="px-5 py-4 text-sm text-gray-700">
                                                                <span
                                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${user.is_active
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-gray-100 text-gray-600"
                                                                        }`}
                                                                >
                                                                    {user.is_active ? "Yes" : "No"}
                                                                </span>
                                                            </td>

                                                            <td className="px-5 py-4">
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:shadow-sm"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="space-y-3 md:hidden">
                                        {users.map((user) => (
                                            <div
                                                key={user.id}
                                                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                            Username
                                                        </p>
                                                        <p className="mt-1 break-words text-base font-semibold text-gray-800">
                                                            {user.username}
                                                        </p>
                                                    </div>

                                                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                                        {user.role}
                                                    </span>
                                                </div>

                                                <div className="mt-4 grid grid-cols-2 gap-3">
                                                    <div className="rounded-2xl bg-gray-50 px-3 py-3">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                            ID
                                                        </p>
                                                        <p className="mt-1 text-sm font-medium text-gray-800">
                                                            {user.id}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-gray-50 px-3 py-3">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                            Active
                                                        </p>
                                                        <div className="mt-1">
                                                            <span
                                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${user.is_active
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-gray-100 text-gray-600"
                                                                    }`}
                                                            >
                                                                {user.is_active ? "Yes" : "No"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="mt-4 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:shadow-sm"
                                                >
                                                    Delete User
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}