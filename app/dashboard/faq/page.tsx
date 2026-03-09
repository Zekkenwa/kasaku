"use client";

import Link from "next/link";
import React from "react";

const faqData = [
    {
        question: "Apa yang bisa Kasaku lakukan?",
        answer: "Saya bisa mencatat pengeluaran & pemasukan, mengelola beberapa dompet, memberikan laporan ringkasan, mencatat hutang/piutang, mengatur tabungan (goal), memberi peringatan batas budget bulanan, dan mencatat transaksi berulang otomatis.",
    },
    {
        question: "Bagaimana cara mencatat pengeluaran?",
        answer: "Format di WhatsApp: `keluar [jumlah] [keterangan] @[kategori] via [dompet]`. Contoh: `keluar 15k kopi pagi @jajan via gopay`. Kata kunci 'via' bersifat opsional jika Anda hanya punya satu dompet.",
    },
    {
        question: "Bagaimana cara mengecek saldo saya?",
        answer: "Ketik perintah `cek saldo` di bot untuk melihat total uang Anda dari semua dompet. Atau ketik `cek wallet` untuk memisahkan saldonya per dompet.",
    },
    {
        question: "Bagaimana cara mencatat hutang atau piutang?",
        answer: "Jika Anda berhutang ke orang: `hutang [jml] @[nama] [ket]`. Jika orang berhutang ke Anda: `piutang [jml] @[nama] [ket]`. Anda bisa membalasnya dengan perintah `bayar [jml] @[nama]` atau `lunas @[nama]` ke depannya.",
    },
    {
        question: "Bagaimana cara mengatur budget bulanan?",
        answer: "Gunakan perintah: `budget [jumlah] @[kategori]`. Contoh: `budget 500k @makan`. Bot akan mulai memantau dan memperingatkan jika pengeluaran kategori tersebut melebihi batas.",
    },
    {
        question: "Bagaimana cara membatalkan transaksi yang salah?",
        answer: "Ketik `undo` di bot. Perintah ini akan membatalkan satu aksi terakhir yang baru saja Anda lakukan di bot (selama belum melebihi 7 hari).",
    },
    {
        question: "Apa itu Saldo Awal?",
        answer: "Saldo Awal HANYA untuk sinkronisasi pertama kali. Ini BUKAN transaksi uang masuk sungguhan. Format: `saldo awal [jumlah]`. Bot akan menjumlahkannya sebagai titik awal perhitungan sistem Anda.",
    },
    {
        question: "Singkatan angka apa saja yang didukung bot?",
        answer: "Ribuan: `k / rb / ribu`. Jutaan: `jt / juta`. Miliar: `m / miliar / milyar / mlr / b`. Triliun: `t / tr / triliun`. Anda juga bisa mengetik kata seperti `seratus ribu` atau `dua juta`.",
    },
];

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* HEADER SECTION */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/60 border-b border-white/5 mx-2 my-2 rounded-2xl">
                <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard"
                            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                        >
                            <span className="text-xl">⬅️</span>
                        </Link>
                        <div>
                            <h1 className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                Kasaku Bantuan
                            </h1>
                            <p className="text-xs text-neutral-400 font-medium tracking-wide">
                                FREQUENTLY ASKED QUESTIONS
                            </p>
                        </div>
                    </div>
                    <span className="text-2xl grayscale">❓</span>
                </div>
            </div>

            <main className="max-w-xl mx-auto px-4 pt-6">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Ada yang bisa dibantu?</h2>
                    <p className="text-neutral-400 text-sm">
                        Temukan jawaban untuk pertanyaan yang paling sering diajukan mengenai penggunaan Kasaku Bot dan Dashboard di sini.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqData.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-neutral-900/50 border border-white/5 rounded-2xl p-5 backdrop-blur-sm group hover:border-white/10 transition-colors"
                        >
                            <h3 className="font-bold text-white mb-2 text-base leading-snug group-hover:text-emerald-400 transition-colors">
                                {faq.question}
                            </h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                {faq.answer.split('`').map((part, i) =>
                                    i % 2 === 1 ? (
                                        <span key={i} className="bg-emerald-500/10 text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded mx-0.5">
                                            {part}
                                        </span>
                                    ) : part
                                )}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                    <p className="text-sm font-medium text-emerald-400 mb-2">Masih Butuh Bantuan?</p>
                    <p className="text-xs text-neutral-400 mb-4">
                        Anda bisa mengetik keluhan atau pertanyaan Anda kapan saja langsung ke bot WhatsApp Kasaku.
                    </p>
                    <a href="https://wa.me/6288902500052" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-emerald-600 transition-colors">
                        Chat WhatsApp Admin
                    </a>
                </div>
            </main>
        </div>
    );
}
