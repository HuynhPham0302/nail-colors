"use client";

import { ChangeEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
    id: number;
    username: string;
    role: string;
};

type MatchResult = {
    id: number;
    brand: string;
    name: string;
    hex: string;
    distance: number;
};

export default function StaffPage() {
    const router = useRouter();

    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [apiMessage, setApiMessage] = useState("");
    const [results, setResults] = useState<MatchResult[]>([]);

    const imgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("http://localhost:8000/me", {
                    credentials: "include",
                });

                const data = await res.json();

                if (!data.user) {
                    router.push("/");
                    return;
                }

                if (data.user.role !== "staff" && data.user.role !== "admin") {
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
            await fetch("http://localhost:8000/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error("Logout failed:", error);
        }

        router.push("/");
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setSelectedPoint(null);
        setSelectedColor(null);
        setApiMessage("");
        setResults([]);
    };

    const handleSearch = async () => {
        if (!selectedColor) {
            alert("Please select a color first");
            return;
        }

        try {
            setApiMessage("");

            const res = await fetch("http://localhost:8000/match-color", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    color: selectedColor,
                }),
            });

            const data = await res.json();
            setResults(data);
        } catch (error) {
            console.error("Search failed:", error);
            setApiMessage("Cannot connect to server");
        }
    };

    const handleImageClick = (e: MouseEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();

        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;

        setSelectedPoint({ x: displayX, y: displayY });

        const naturalX = Math.floor((displayX / rect.width) * img.naturalWidth);
        const naturalY = Math.floor((displayY / rect.height) * img.naturalHeight);

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        const pixel = ctx.getImageData(naturalX, naturalY, 1, 1).data;
        const [r, g, b] = pixel;

        const hex =
            "#" +
            [r, g, b]
                .map((value) => value.toString(16).padStart(2, "0"))
                .join("");

        setSelectedColor(hex);
        setApiMessage("");
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-100 px-4 py-10">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur">
                        <p className="text-center text-base font-medium text-gray-500">Loading...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (!user) return null;

    return (
        <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-100 px-4 py-8 md:py-12">
            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/85 shadow-2xl backdrop-blur">
                    <div className="border-b border-pink-100 bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-8 text-white md:px-8">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                                    Nail Color App
                                </p>
                                <h1 className="text-3xl font-bold md:text-4xl">
                                    Color Search
                                </h1>
                                <p className="mt-3 max-w-xl text-sm text-pink-50 md:text-base">
                                    Upload an image, tap any color on the photo, and search for the closest match in your database.
                                </p>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-pink-600 shadow-md transition hover:scale-[1.02] hover:bg-pink-50 active:scale-[0.99]"
                            >
                                Logout
                            </button>
                        </div>

                        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm">
                            <span className="h-2.5 w-2.5 rounded-full bg-green-300"></span>
                            <span>
                                Welcome, <span className="font-semibold">{user.username}</span>
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
                        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-5">
                                <h2 className="text-xl font-semibold text-gray-800">Upload Image</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Choose an image and click directly on the color you want.
                                </p>
                            </div>

                            <div className="mb-5">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    id="fileInput"
                                    className="hidden"
                                />

                                <label
                                    htmlFor="fileInput"
                                    className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/60 px-6 py-8 text-center transition hover:border-pink-400 hover:bg-pink-50"
                                >
                                    <span className="text-base font-semibold text-gray-700">
                                        Upload Image
                                    </span>
                                    <span className="mt-2 text-sm text-gray-500">
                                        Tap to select from your device
                                    </span>
                                </label>
                            </div>

                            <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-inner">
                                <div className="min-h-[280px] flex items-center justify-center">
                                    {imageUrl ? (
                                        <div className="relative w-full">
                                            <img
                                                ref={imgRef}
                                                src={imageUrl}
                                                alt="Preview"
                                                onClick={handleImageClick}
                                                className="max-h-[420px] w-full cursor-crosshair object-contain"
                                            />

                                            {selectedPoint && (
                                                <div
                                                    className="absolute h-5 w-5 rounded-full border-4 border-white bg-pink-500 shadow-lg ring-2 ring-pink-200"
                                                    style={{
                                                        left: selectedPoint.x - 10,
                                                        top: selectedPoint.y - 10,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <p className="px-4 text-center text-gray-400">
                                            No image selected
                                        </p>
                                    )}
                                </div>
                            </div>

                            {selectedColor ? (
                                <div className="mb-5 flex items-center justify-between rounded-2xl border border-pink-100 bg-pink-50/60 p-4 shadow-sm">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">
                                            Selected Color
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-gray-800">
                                            {selectedColor}
                                        </p>
                                    </div>

                                    <div
                                        className="h-14 w-14 rounded-xl border-2 border-white shadow"
                                        style={{ backgroundColor: selectedColor }}
                                    />
                                </div>
                            ) : (
                                <div className="mb-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-400">
                                    Selected color will appear here
                                </div>
                            )}

                            <button
                                onClick={handleSearch}
                                className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] hover:from-pink-600 hover:to-rose-600 active:scale-[0.99]"
                            >
                                Search Matching Colors
                            </button>

                            {apiMessage && (
                                <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                    {apiMessage}
                                </p>
                            )}
                        </section>

                        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Results</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Closest nail colors from your database
                                    </p>
                                </div>

                                <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600">
                                    {results.length} item{results.length !== 1 ? "s" : ""}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {results.length === 0 ? (
                                    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-gray-400">
                                        No results yet
                                    </div>
                                ) : (
                                    results.map((color, index) => (
                                        <div
                                            key={color.id}
                                            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-600">
                                                    {index + 1}
                                                </div>

                                                <div>
                                                    <p className="text-base font-semibold text-gray-800">
                                                        {color.brand} - {color.name}
                                                    </p>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        HEX: {color.hex}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Distance: {color.distance.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div
                                                className="h-12 w-12 rounded-xl border border-gray-200 shadow-sm"
                                                style={{ backgroundColor: color.hex }}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}