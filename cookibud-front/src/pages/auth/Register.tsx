
import { Button, Form, Input, useToast } from "@soilhat/react-components";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router"
import { useAuth } from "../../routing/useAuth";

export default function Register() {
    const { t } = useTranslation('translation', { keyPrefix: 'pages.auth.register' });
    const [input, setInput] = useState({ username: " ", password: " " })
    const auth = useAuth();
    const { success } = useToast();
    const location = useLocation();

    const handleSubmitEvent = (e: FormEvent) => {
        e.preventDefault();
        if (localStorage.getItem("demo") || (input.username !== " " && input.password !== " ")) {
            if (localStorage.getItem("demo")) success(t("demo_toast"), 3000);
            auth.registerAction(input);
        }
    }

    const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "password confirm" && value !== input.password) {
            e.target.setCustomValidity(t("password_mismatch"));
        } else {
            e.target.setCustomValidity("");
        }
        if (name === "password confirm" || e.target.validity.valid === false) return;
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
                <Input type="password"
                    id="password_confirm"
                    name="password confirm"
                    placeholder="••••••••"
                    onChange={handleInput}
                    label={t("confirm_password")}
                    size="md"
                    variant="outline"
                    required
                />
                <Button onClick={() => localStorage.removeItem("demo")}>
                    {t("register")}
                </Button>
            </Form>
            <p className="text-center text-sm">
                <Link className="text-accent dark:text-accent/90 hover:underline" to={`/auth/login${location.search}`}>{t("login")}</Link>
            </p>
        </>
    )
}