"use client";

import { ChangeEvent, MouseEvent, useRef, useState } from "react";

export default function AddColorPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [brand, setBrand] = useState("");
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setSelectedPoint(null);
        setSelectedColor(null);
        setMessage("");
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
        setMessage("");
    };

    const handleAddColor = async () => {
        if (!selectedColor) {
            alert("Please select a color first");
            return;
        }

        if (!brand.trim()) {
            alert("Please enter a brand");
            return;
        }

        if (!name.trim()) {
            alert("Please enter a color name");
            return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/add-color`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                brand,
                name,
                hex: selectedColor,
            }),
        });

        const data = await res.json();
        console.log(data);

        setMessage(data.message || "Color added");

        setBrand("");
        setName("");
        setSelectedPoint(null);
        setSelectedColor(null);
        setImageUrl(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-8 md:py-12">
            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden rounded-[30px] border border-white/60 bg-white/90 shadow-2xl backdrop-blur">
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-600 px-6 py-8 text-white md:px-8 md:py-10">
                        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                            Nail Color App
                        </p>
                        <h1 className="text-3xl font-bold md:text-4xl">
                            Add Color
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                            Upload an image, tap a color, then enter the brand and color name to save it to your database.
                        </p>
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-5">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    Upload and Select Color
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Choose an image and click directly on the color you want to save.
                                </p>
                            </div>

                            <div className="mb-6">
                                <input
                                    ref={fileInputRef}
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

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Brand
                                    </label>
                                    <input
                                        type="text"
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                        placeholder="Enter brand"
                                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Color Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter color name"
                                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                                    />
                                </div>

                                <button
                                    onClick={handleAddColor}
                                    className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] hover:from-pink-600 hover:to-rose-600 active:scale-[0.99]"
                                >
                                    Add Color
                                </button>

                                {message && (
                                    <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                                        {message}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}