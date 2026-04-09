"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Technician = {
    id: number;
    username: string;
    checkedIn: boolean;
    checkInOrder: number | null;
    inProgress: boolean;
    startedAt: number | null;
    appointmentMode: boolean;
    bonusMode: boolean;
    bonusInput: string;
    bonusAmount: number;
    turnPoints: number;
};

function formatTurn(points: number) {
    const value = points / 2;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatElapsed(startedAt: number | null, now: number) {
    if (!startedAt) return "00:00";

    const diffSeconds = Math.floor((now - startedAt) / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseBonusInput(value: string) {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return 0;
    return num;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TurnManagementPage() {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [fixMode, setFixMode] = useState(false);
    const [showStaffListModal, setShowStaffListModal] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const hasLoadedRef = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const todayLabel = useMemo(() => {
        return new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }, []);

    const nextCheckInOrder = useMemo(() => {
        const maxOrder = technicians.reduce((max, tech) => {
            if (tech.checkInOrder === null) return max;
            return Math.max(max, tech.checkInOrder);
        }, 0);

        return maxOrder + 1;
    }, [technicians]);

    const availableStaff = technicians.filter((tech) => !tech.checkedIn && !tech.inProgress);

    const checkedInStaff = [...technicians]
        .filter((tech) => tech.checkedIn && !tech.inProgress)
        .sort((a, b) => {
            const aPriority = Math.floor(a.turnPoints / 2);
            const bPriority = Math.floor(b.turnPoints / 2);

            if (aPriority !== bPriority) return aPriority - bPriority;
            return (a.checkInOrder ?? 9999) - (b.checkInOrder ?? 9999);
        });

    const inProgressStaff = [...technicians]
        .filter((tech) => tech.inProgress)
        .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));

    useEffect(() => {
        const fetchTurnStaff = async () => {
            try {
                setLoading(true);

                const res = await fetch(`${API_BASE}/admin/turn/staff`, {
                    credentials: "include",
                });

                const data = await res.json();

                if (!res.ok) {
                    console.error("Failed to load turn staff:", data);
                    alert(data.detail || data.message || "Failed to load staff data");
                    return;
                }

                setTechnicians(data);
                hasLoadedRef.current = true;
            } catch (error) {
                console.error("Failed to load turn staff:", error);
                alert("Failed to load staff data");
            } finally {
                setLoading(false);
            }
        };

        fetchTurnStaff();
    }, []);

    useEffect(() => {
        if (!hasLoadedRef.current) return;
        if (technicians.length === 0) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                setSaving(true);

                await fetch(`${API_BASE}/admin/turn/save-state`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ technicians }),
                });
            } catch (error) {
                console.error("Failed to save turn state:", error);
            } finally {
                setSaving(false);
            }
        }, 400);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [technicians]);

    const handleAddSingleToCheckedIn = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        checkedIn: true,
                        checkInOrder: nextCheckInOrder,
                    }
                    : tech
            )
        );
    };

    const handleStartService = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        checkedIn: true,
                        inProgress: true,
                        startedAt: Date.now(),
                    }
                    : tech
            )
        );
    };

    const handleToggleAppointment = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        appointmentMode: !tech.appointmentMode,
                        bonusMode: tech.appointmentMode ? tech.bonusMode : false,
                        bonusInput: tech.appointmentMode ? tech.bonusInput : "",
                    }
                    : tech
            )
        );
    };

    const handleToggleBonus = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) => {
                if (tech.id !== id) return tech;

                const nextBonusMode = !tech.bonusMode;

                return {
                    ...tech,
                    bonusMode: nextBonusMode,
                    appointmentMode: nextBonusMode ? false : tech.appointmentMode,
                    bonusInput: nextBonusMode ? tech.bonusInput : "",
                };
            })
        );
    };

    const handleBonusInputChange = (id: number, value: string) => {
        if (sessionEnded) return;
        if (!/^\d*\.?\d*$/.test(value)) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        bonusInput: value,
                    }
                    : tech
            )
        );
    };

    const handleDoneService = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) => {
                if (tech.id !== id) return tech;

                let nextTurnPoints = tech.turnPoints;
                let nextBonusAmount = tech.bonusAmount;

                if (tech.bonusMode) {
                    const serviceBonus = parseBonusInput(tech.bonusInput);
                    const totalBonus = nextBonusAmount + serviceBonus;

                    if (totalBonus >= 30) {
                        nextTurnPoints += 2;
                        nextBonusAmount = 0;
                    } else {
                        nextBonusAmount = totalBonus;
                    }
                } else {
                    const addedPoints = tech.appointmentMode ? 1 : 2;
                    nextTurnPoints += addedPoints;
                }

                return {
                    ...tech,
                    checkedIn: true,
                    inProgress: false,
                    startedAt: null,
                    appointmentMode: false,
                    bonusMode: false,
                    bonusInput: "",
                    bonusAmount: nextBonusAmount,
                    turnPoints: nextTurnPoints,
                };
            })
        );
    };

    const handleAdjustTurnPoints = (id: number, delta: number) => {
        if (!fixMode || sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) => {
                if (tech.id !== id) return tech;
                return {
                    ...tech,
                    turnPoints: Math.max(0, tech.turnPoints + delta),
                };
            })
        );
    };

    const handleMoveCheckInOrder = (id: number, direction: "up" | "down") => {
        if (!fixMode || sessionEnded) return;

        const checkedInOnly = [...technicians]
            .filter((tech) => tech.checkedIn && !tech.inProgress)
            .sort((a, b) => (a.checkInOrder ?? 9999) - (b.checkInOrder ?? 9999));

        const index = checkedInOnly.findIndex((tech) => tech.id === id);
        if (index === -1) return;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= checkedInOnly.length) return;

        const currentTech = checkedInOnly[index];
        const targetTech = checkedInOnly[targetIndex];

        const currentOrder = currentTech.checkInOrder;
        const targetOrder = targetTech.checkInOrder;

        setTechnicians((prev) =>
            prev.map((tech) => {
                if (tech.id === currentTech.id) return { ...tech, checkInOrder: targetOrder };
                if (tech.id === targetTech.id) return { ...tech, checkInOrder: currentOrder };
                return tech;
            })
        );
    };

    const handleRemoveCheckIn = (id: number) => {
        if (!fixMode || sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        checkedIn: false,
                        checkInOrder: null,
                        inProgress: false,
                        startedAt: null,
                        appointmentMode: false,
                        bonusMode: false,
                        bonusInput: "",
                    }
                    : tech
            )
        );
    };

    const handleCancelInProgress = (id: number) => {
        if (!fixMode || sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        checkedIn: true,
                        inProgress: false,
                        startedAt: null,
                        appointmentMode: false,
                        bonusMode: false,
                        bonusInput: "",
                    }
                    : tech
            )
        );
    };

    const handleDoneForToday = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to finish today and save all turn data?"
        );
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_BASE}/admin/turn/done-for-today`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ technicians }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.detail || data.message || "Failed to save today's data");
                return;
            }

            setSessionEnded(true);
            setShowStaffListModal(false);
            alert("Today is finished and saved to database.");
        } catch (error) {
            console.error(error);
            alert("Failed to save today's data.");
        }
    };

    const handleResetBoard = async () => {
        const confirmed = window.confirm("Reset the board for a new day?");
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_BASE}/admin/turn/reset`, {
                method: "POST",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.detail || data.message || "Failed to reset board");
                return;
            }

            setTechnicians((prev) =>
                prev.map((tech) => ({
                    ...tech,
                    checkedIn: false,
                    checkInOrder: null,
                    inProgress: false,
                    startedAt: null,
                    appointmentMode: false,
                    bonusMode: false,
                    bonusInput: "",
                    bonusAmount: 0,
                    turnPoints: 0,
                }))
            );

            setSessionEnded(false);
            setFixMode(false);
            setShowStaffListModal(false);
        } catch (error) {
            console.error(error);
            alert("Failed to reset board.");
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-6 md:py-10">
            <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-[30px] border border-white/60 bg-white/90 shadow-2xl backdrop-blur">
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-600 px-6 py-8 text-white md:px-8 md:py-10">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                                    Nail Color App
                                </p>
                                <h1 className="text-3xl font-bold md:text-4xl">Turn Management</h1>
                                <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
                                    Manage daily technician check-in, service progress, bonus tracking, and turn
                                    counting.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                <button
                                    onClick={() => setShowStaffListModal(true)}
                                    disabled={sessionEnded || loading}
                                    className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Staff List
                                </button>

                                <button
                                    onClick={() => setFixMode((prev) => !prev)}
                                    disabled={sessionEnded || loading}
                                    className={`rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${fixMode
                                        ? "bg-amber-200 text-amber-900 hover:bg-amber-300"
                                        : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                                        }`}
                                >
                                    Fix Mode: {fixMode ? "On" : "Off"}
                                </button>

                                <button
                                    onClick={handleResetBoard}
                                    disabled={loading}
                                    className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Reset Board
                                </button>

                                <button
                                    onClick={handleDoneForToday}
                                    disabled={loading}
                                    className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-md transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Done for Today
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <div className="rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                                {todayLabel}
                            </div>

                            <div
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${sessionEnded ? "bg-amber-200 text-amber-900" : "bg-green-200 text-green-900"
                                    }`}
                            >
                                {sessionEnded ? "Session Ended" : "Session Active"}
                            </div>

                            {fixMode && !sessionEnded && (
                                <div className="rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold text-amber-900">
                                    Fix Mode Active
                                </div>
                            )}

                            {loading && (
                                <div className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
                                    Loading...
                                </div>
                            )}

                            {saving && !loading && (
                                <div className="rounded-full bg-sky-200 px-4 py-2 text-sm font-semibold text-sky-900">
                                    Saving...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6 p-4 md:grid-cols-2 md:p-8">
                        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Checked In</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Sorted by turn priority, then check-in order.
                                    </p>
                                </div>
                                <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                                    {checkedInStaff.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {loading ? (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                        Loading staff...
                                    </div>
                                ) : checkedInStaff.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                        No technician checked in yet.
                                    </div>
                                ) : (
                                    checkedInStaff.map((tech) => (
                                        <div
                                            key={tech.id}
                                            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-3">
                                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                                            <p className="truncate text-2xl font-bold text-gray-800">
                                                                {tech.username}
                                                            </p>

                                                            {tech.appointmentMode && (
                                                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                                                    Appointment
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="rounded-2xl bg-slate-100 px-3 py-2">
                                                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                Turn
                                                            </span>
                                                            <p className="text-lg font-bold text-slate-800">
                                                                {formatTurn(tech.turnPoints)}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl bg-pink-50 px-3 py-2">
                                                            <span className="text-xs font-medium uppercase tracking-wide text-pink-500">
                                                                Check-In
                                                            </span>
                                                            <p className="text-lg font-bold text-pink-700">
                                                                {tech.checkInOrder ?? "-"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                                                            <span className="text-xs font-medium uppercase tracking-wide text-emerald-500">
                                                                Bonus
                                                            </span>
                                                            <p className="text-lg font-bold text-emerald-700">
                                                                ${tech.bonusAmount}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleStartService(tech.id)}
                                                        disabled={sessionEnded}
                                                        className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Start Service
                                                    </button>
                                                </div>

                                                {fixMode && (
                                                    <div className="flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-3">
                                                        <button
                                                            onClick={() => handleMoveCheckInOrder(tech.id, "up")}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Move Up
                                                        </button>

                                                        <button
                                                            onClick={() => handleMoveCheckInOrder(tech.id, "down")}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Move Down
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, -1)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            -0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 1)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            +0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 2)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            +1
                                                        </button>

                                                        <button
                                                            onClick={() => handleRemoveCheckIn(tech.id)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Remove Check In
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">In Progress</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Technicians currently serving customers.
                                    </p>
                                </div>
                                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                    {inProgressStaff.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {loading ? (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                        Loading staff...
                                    </div>
                                ) : inProgressStaff.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                        No technician is in progress right now.
                                    </div>
                                ) : (
                                    inProgressStaff.map((tech) => (
                                        <div
                                            key={tech.id}
                                            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-3">
                                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                                            <p className="truncate text-2xl font-bold text-gray-800">
                                                                {tech.username}
                                                            </p>

                                                            {tech.appointmentMode && (
                                                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                                                    Appointment
                                                                </span>
                                                            )}

                                                            {tech.bonusMode && (
                                                                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                                                    Bonus
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="rounded-2xl bg-slate-100 px-3 py-2">
                                                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                                Turn
                                                            </span>
                                                            <p className="text-lg font-bold text-slate-800">
                                                                {formatTurn(tech.turnPoints)}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl bg-pink-50 px-3 py-2">
                                                            <span className="text-xs font-medium uppercase tracking-wide text-pink-500">
                                                                Check-In
                                                            </span>
                                                            <p className="text-lg font-bold text-pink-700">
                                                                {tech.checkInOrder ?? "-"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                                                            <span className="text-xs font-medium uppercase tracking-wide text-emerald-500">
                                                                Bonus
                                                            </span>
                                                            <p className="text-lg font-bold text-emerald-700">
                                                                ${tech.bonusAmount}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl bg-violet-50 px-3 py-2">
                                                            <span className="text-xs font-medium uppercase tracking-wide text-violet-500">
                                                                Time
                                                            </span>
                                                            <p className="text-lg font-bold text-violet-700">
                                                                {formatElapsed(tech.startedAt, now)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleToggleAppointment(tech.id)}
                                                        disabled={sessionEnded}
                                                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tech.appointmentMode
                                                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        Has Appointment
                                                    </button>

                                                    <button
                                                        onClick={() => handleToggleBonus(tech.id)}
                                                        disabled={sessionEnded}
                                                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tech.bonusMode
                                                            ? "bg-sky-100 text-sky-800 hover:bg-sky-200"
                                                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        Bonus
                                                    </button>

                                                    <button
                                                        onClick={() => handleDoneService(tech.id)}
                                                        disabled={sessionEnded}
                                                        className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Done
                                                    </button>
                                                </div>

                                                {tech.bonusMode && (
                                                    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3">
                                                        <label className="text-sm font-medium text-sky-800">
                                                            Bonus amount
                                                        </label>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={tech.bonusInput}
                                                            onChange={(e) =>
                                                                handleBonusInputChange(tech.id, e.target.value)
                                                            }
                                                            placeholder="Enter amount"
                                                            className="w-40 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                                        />
                                                        <span className="text-sm text-sky-700">
                                                            If total bonus reaches $30, add 1 turn after Done and reset
                                                            to $0
                                                        </span>
                                                    </div>
                                                )}

                                                {fixMode && (
                                                    <div className="flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-3">
                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, -1)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            -0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 1)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            +0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 2)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            +1
                                                        </button>

                                                        <button
                                                            onClick={() => handleCancelInProgress(tech.id)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Cancel Service
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {showStaffListModal && !sessionEnded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-2xl">
                        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">Staff List</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Add technicians one by one in the exact order they arrive.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowStaffListModal(false)}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto px-5 py-5 sm:px-6">
                            {loading ? (
                                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                    Loading staff...
                                </div>
                            ) : availableStaff.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                    No available staff left to add.
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {availableStaff.map((tech) => (
                                        <div
                                            key={tech.id}
                                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-lg font-semibold text-gray-800">
                                                            {tech.username}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Turn: {formatTurn(tech.turnPoints)} · Bonus: $
                                                            {tech.bonusAmount}
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={() => handleAddSingleToCheckedIn(tech.id)}
                                                        className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                    >
                                                        Add
                                                    </button>
                                                </div>

                                                {fixMode && (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, -1)}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                                        >
                                                            -0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 1)}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                                        >
                                                            +0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 2)}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                                        >
                                                            +1
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 px-5 py-4 sm:px-6">
                            <p className="text-sm text-gray-500">
                                Add each technician in arrival order, then close this list when finished.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}