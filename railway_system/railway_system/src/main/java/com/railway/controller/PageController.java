package com.railway.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import javax.servlet.http.HttpSession;

@Controller
public class PageController {
    
    @GetMapping("/")
    public String index(HttpSession session) {
        // 检查是否已登录
        if (session.getAttribute("user") == null) {
            return "redirect:/login";
        }
        return "index";
    }
    
    @GetMapping("/login")
    public String login(HttpSession session) {
        // 如果已登录，直接跳转首页
        if (session.getAttribute("user") != null) {
            return "redirect:/";
        }
        return "login";
    }
    
    @GetMapping("/dashboard")
    public String dashboard(HttpSession session) {
        if (session.getAttribute("user") == null) {
            return "redirect:/login";
        }
        return "index";
    }
}
