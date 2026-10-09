"use client"
import { Button } from '@/components/ui/button'
import React from 'react'
import { useRouter } from 'next/navigation'

const AuthPage = () => {
  const router = useRouter()
  return (
    <div className='grid min-h-screen place-items-center mx-5'>
      <div
        className='flex flex-col gap-10 w-full max-w-xl rounded-2xl shadow-2xl bg-white p-5'
      >
        <div className='flex flex-col gap-2 text-center'>
          <h1 className='text-4xl font-bold'>LaFerrey</h1>
          <p className='text-2xl font-light'>Inicia sesión</p>
        </div>
        <div className='flex flex-col gap-3.5'>
          <input className='w-full border-2 p-4 rounded-2xl' type='email' placeholder='jhon@example.com'></input>
          <input className='w-full border-2 p-4 rounded-2xl' type='password' placeholder='Contraseña'></input>
          <Button onClick={() => router.push("/negociogenerico")} className='cursor-pointer py-8 text-2xl rounded-2xl' size={'lg'} variant="default">Ingresar</Button>

        </div>

      </div>
    </div>
  )
}

export default AuthPage
