import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useState, type FormEvent, type ChangeEvent } from "react";

import { Button, Form, Input, useToast } from "@soilhat/react-components";

import { useAuth } from "../../routing/AuthProvider";


export default function Login() {
    const { t } = useTranslation('translation', { keyPrefix: 'pages.auth.login' });
    const [input, setInput] = useState({ username: " ", password: " " })
    const auth = useAuth();
    const { success } = useToast();

    const handleSubmitEvent = (e: FormEvent) => {
        e.preventDefault();
        if (localStorage.getItem("demo") || (input.username !== " " && input.password !== " ")) {
            if (localStorage.getItem("demo")) success(t("demo_toast"), 3000);
            auth.loginAction(input);
            return;
        }
        alert(t("invalid"))
    }

    const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInput((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    return (
        <>
            <h2 className="text-primary dark:text-yellow-300 text-2xl font-bold text-center mb-6">{t("greetings")}</h2>
            <Form method="post" id="loginForm" onSubmit={handleSubmitEvent}>
                <Input
                    name="username"
                    type="string"
                    label={t("username", { keyPrefix: "pages.user" })}
                    placeholder={t("username", { keyPrefix: "pages.user" })}
                    autoComplete="off"
                    onChange={handleInput}
                    size="md"
                    variant="outline"
                    required
                />
                <Input type="password"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    onChange={handleInput}
                    label={t("password", { keyPrefix: "pages.user" })}
                    size="md"
                    variant="outline"
                    required
                />
                <Button  onClick={() => localStorage.removeItem("demo")}>
                    {t("login")}
                </Button>
                <Button onClick={() => localStorage.setItem("demo", "true")} variant="border">
                    {t("demo")}
                </Button>
            </Form>
            <p className="text-center text-sm">
                <Link className="text-purple-600 dark:text-purple-400 hover:underline" to="/auth/register">{t("create_account")}</Link>
            </p>
        </>
    )
}