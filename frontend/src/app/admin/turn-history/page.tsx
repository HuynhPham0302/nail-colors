"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
    id: number;
    username: string;
    role: string;
};

type HistoryItem = {
    id: number;
    user_id: number;
    username: string;
    work_date: string;
    final_checked_in: boolean;
    final_check_in_order: number | null;
    final_in_progress: boolean;
    final_started_at: number | null;
    final_appointment_mode: boolean;
    final_bonus_mode: boolean;
    final_bonus_input: string;
    final_bonus_amount: number;
    final_turn_points: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatTurn(points: number) {
    const value = points / 2;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatWorkDate(workDate: string) {
    if (workDate.length !== 8) return workDate;

    const year = Number(workDate.slice(0, 4));
    const month = Number(workDate.slice(4, 6)) - 1;
    const day = Number(workDate.slice(6, 8));

    return new Date(year, month, day).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export default function TurnHistoryPage() {
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            try {
                const meRes = await fetch(`${API_BASE}/me`, {
                    credentials: "include",
                });

                const meData = await meRes.json();

                if (!meData.user) {
                    router.push("/");
                    return;
                }

                if (meData.user.role !== "admin") {
                    router.push("/");
                    return;
                }

                setCurrentUser(meData.user);

                const historyRes = await fetch(`${API_BASE}/admin/turn/history`, {
                    credentials: "include",
                });

                const historyData = await historyRes.json();

                if (!historyRes.ok) {
                    alert(historyData.detail || historyData.message || "Failed to load turn history");
                    return;
                }

                setHistory(Array.isArray(historyData) ? historyData : []);
            } catch (error) {
                console.error("Failed to load turn history:", error);
                alert("Cannot connect to server");
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndLoad();
    }, [router]);

    const groupedHistory = useMemo(() => {
        const filtered = history.filter((item) => {
            const keyword = search.trim().toLowerCase();
            if (!keyword) return true;

            return (
                item.username.toLowerCase().includes(keyword) ||
                item.work_date.includes(keyword)
            );
        });

        const map = new Map<string, HistoryItem[]>();

        for (const item of filtered) {
            if (!map.has(item.work_date)) {
                map.set(item.work_date, []);
            }
            map.get(item.work_date)!.push(item);
        }

        return Array.from(map.entries()).map(([workDate, items]) => ({
            workDate,
            items: [...items].sort((a, b) => {
                const aTurn = a.final_turn_points;
                const bTurn = b.final_turn_points;

                const aPriority = Math.floor(aTurn / 2);
                const bPriority = Math.floor(bTurn / 2);

                if (aPriority !== bPriority) return aPriority - bPriority;

                return (a.final_check_in_order ?? 9999) - (b.final_check_in_order ?? 9999);
            }),
        }));
    }, [history, search]);

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-10">
                <div className="mx-auto max-w-7xl">
                    <div className="rounded-[30px] border border-white/70 bg-white/90 p-8 shadow-xl">
                        <p className="text-center text-base font-medium text-gray-500">Loading...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (!currentUser) return null;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-6 md:py-10">
            <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-[30px] border border-white/60 bg-white/90 shadow-2xl backdrop-blur">
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-600 px-6 py-8 text-white md:px-8 md:py-10">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                                    Nail Color App
                                </p>
                                <h1 className="text-3xl font-bold md:text-4xl">Turn History</h1>
                                <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
                                    Review saved daily turn data from the database.
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                                <span className="h-2.5 w-2.5 rounded-full bg-green-300"></span>
                                <span>
                                    Welcome, <span className="font-semibold">{currentUser.username}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-8">
                        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800">Saved Days</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Each section below is one saved day from DailyTurnHistory.
                                </p>
                            </div>

                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by staff name or date"
                                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition md:w-80 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                            />
                        </div>

                        {groupedHistory.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                                No saved turn history found.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {groupedHistory.map((group) => (
                                    <section
                                        key={group.workDate}
                                        className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                                    >
                                        <div className="flex flex-col gap-3 border-b border-gray-200 bg-pink-50/50 px-5 py-4 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-800">
                                                    {formatWorkDate(group.workDate)}
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Raw date key: {group.workDate}
                                                </p>
                                            </div>

                                            <div className="inline-flex w-fit items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-pink-600 shadow-sm">
                                                {group.items.length} staff
                                            </div>
                                        </div>

                                        <div className="w-full overflow-x-auto">
                                            <table className="min-w-[980px] border-collapse">
                                                <thead className="border-b border-gray-200 bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Username
                                                        </th>
                                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Turn
                                                        </th>
                                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Check-In
                                                        </th>
                                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Bonus Total
                                                        </th>
                                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Appointment
                                                        </th>
                                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Bonus Mode
                                                        </th>
                                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Checked In
                                                        </th>
                                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                                                            In Progress
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {group.items.map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className="border-b border-gray-100 transition hover:bg-pink-50/30 last:border-b-0"
                                                        >
                                                            <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                                                {item.username}
                                                            </td>

                                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                                {formatTurn(item.final_turn_points)}
                                                            </td>

                                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                                {item.final_check_in_order ?? "-"}
                                                            </td>

                                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                                ${item.final_bonus_amount}
                                                            </td>

                                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                                <span
                                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${item.final_appointment_mode
                                                                            ? "bg-amber-100 text-amber-700"
                                                                            : "bg-gray-100 text-gray-600"
                                                                        }`}
                                                                >
                                                                    {item.final_appointment_mode ? "Yes" : "No"}
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                                <span
                                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${item.final_bonus_mode
                                                                            ? "bg-sky-100 text-sky-700"
                                                                            : "bg-gray-100 text-gray-600"
                                                                        }`}
                                                                >
                                                                    {item.final_bonus_mode ? "Yes" : "No"}
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                                <span
                                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${item.final_checked_in
                                                                            ? "bg-green-100 text-green-700"
                                                                            : "bg-gray-100 text-gray-600"
                                                                        }`}
                                                                >
                                                                    {item.final_checked_in ? "Yes" : "No"}
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                                <span
                                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${item.final_in_progress
                                                                            ? "bg-rose-100 text-rose-700"
                                                                            : "bg-gray-100 text-gray-600"
                                                                        }`}
                                                                >
                                                                    {item.final_in_progress ? "Yes" : "No"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}