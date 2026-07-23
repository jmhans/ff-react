import { PowerIcon } from '@heroicons/react/24/outline';


export const SignupButton = () => {
    return (
      <a className="button__sign-up" href="/auth/login?screen_hint=signup">
        Sign Up
      </a>
    );
  };

  export const LogoutButton = () => {
    return (
      <a className="flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3" href="/auth/logout">
      <PowerIcon className="w-6 shrink-0" /><p className="hidden md:block">Log Out</p>
      </a>
    );
  };

  export const LoginButton = () => {
    return (
      <a className="button__login" href="/auth/login?returnTo=/dashboard">
        Log In
      </a>
    );
  };
