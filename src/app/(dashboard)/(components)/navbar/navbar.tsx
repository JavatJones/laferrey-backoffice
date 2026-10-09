import { Button } from '@/components/ui/button'
import React from 'react'
import { LogOut, Menu } from "lucide-react"
export const NavbarDashboard = () => {
    return (
        <nav className=' py-5 bg-white'>
            <section className='flex flex-row justify-between items-center px-6'>
                <article className='flex flex-row items-center'>
                    <Button size={'icon-lg'} variant={'ghost'} className={"hidden mr-2"}>
                        <Menu size={20}></Menu>
                    </Button>

                    <span className='font-black tracking-tight'>LaFerrey</span>
                    <div></div>
                </article>
                <article>
                    <Button size={'icon-lg'} variant={'ghost'} >
                        <LogOut size={20}></LogOut>
                    </Button>
                </article>
            </section>
        </nav>
    )
}
