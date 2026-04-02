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
    final_check_in_order: number | null;
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
    const [selectedDate, setSelectedDate] = useState("");

    const fetchHistory = async (dateValue?: string) => {
        try {
            let url = `${API_BASE}/admin/turn/history`;

            if (dateValue) {
                url += `?date=${dateValue}`;
            }

            const res = await fetch(url, {
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.detail || data.message || "Failed to load turn history");
                return;
            }

            setHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load turn history:", error);
            alert("Cannot connect to server");
        }
    };

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
                await fetchHistory();
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
        const map = new Map<string, HistoryItem[]>();

        for (const item of history) {
            if (!map.has(item.work_date)) {
                map.set(item.work_date, []);
            }
            map.get(item.work_date)!.push(item);
        }

        return Array.from(map.entries()).map(([workDate, items]) => ({
            workDate,
            items: [...items].sort((a, b) => {
                const aPriority = Math.floor(a.final_turn_points / 2);
                const bPriority = Math.floor(b.final_turn_points / 2);

                if (aPriority !== bPriority) return aPriority - bPriority;
                return (a.final_check_in_order ?? 9999) - (b.final_check_in_order ?? 9999);
            }),
        }));
    }, [history]);

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
                                    Choose a date to view only that day&apos;s saved turn data.
                                </p>
                            </div>

                            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                                />

                                <button
                                    onClick={() => fetchHistory(selectedDate)}
                                    className="rounded-2xl bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-700"
                                >
                                    View Date
                                </button>

                                <button
                                    onClick={() => {
                                        setSelectedDate("");
                                        fetchHistory();
                                    }}
                                    className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    Show All
                                </button>
                            </div>
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
                                            <table className="min-w-full border-collapse">
                                                <thead className="border-b border-gray-200 bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Username
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Turn
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                                            Check-In
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {group.items.map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className="border-b border-gray-100 transition hover:bg-pink-50/30 last:border-b-0"
                                                        >
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-800">
                                                                {item.username}
                                                            </td>

                                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                                {formatTurn(item.final_turn_points)}
                                                            </td>

                                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                                {item.final_check_in_order ?? "-"}
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