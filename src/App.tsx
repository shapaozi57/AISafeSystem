/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  User, 
  FileText, 
  Mic, 
  GraduationCap, 
  AlertTriangle, 
  Download, 
  Info, 
  Send,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Search,
  History,
  Activity,
  MicOff,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  School,
  Smile,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface DetectionResult {
  riskLevel: '低风险' | '中风险' | '高风险';
  suggestion: string;
}

interface HistoryReport {
  id: string;
  timestamp: string;
  type: '文本' | '语音' | '问答';
  content: string;
  result: DetectionResult;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [showPassword, setShowPassword] = useState(false);
  
  // Login state
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');

  // Registration state
  const [regData, setRegData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [regError, setRegError] = useState('');
  
  // Forgot password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<'idle' | 'success'>('idle');

  const [inputText, setInputText] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [knowledgeQuestion, setKnowledgeQuestion] = useState('');
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState('');
  const [lastKnowledgeQuestion, setLastKnowledgeQuestion] = useState('');
  const [knowledgeAnswer, setKnowledgeAnswer] = useState(
    '你好，我是安全知识助手。你可以问我“遇到校园欺凌怎么办”“被陌生人尾随怎么办”等问题。'
  );
  const [recentKnowledgeSessions, setRecentKnowledgeSessions] = useState<
    Array<{ question: string; answer: string; riskLevel: '低风险' | '中风险' | '高风险' }>
  >([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizWrongCountdown, setQuizWrongCountdown] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<'全部' | '低风险' | '中风险' | '高风险'>('全部');
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [historyReports, setHistoryReports] = useState<HistoryReport[]>([]);
  const [stats, setStats] = useState({
    detectionCount: 0,
    studentsHelped: 0,
    todayQaCount: 0
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const savedAuth = localStorage.getItem('safety_guardian_auth');
    const savedUser = localStorage.getItem('safety_guardian_user');
    if (savedAuth === 'true' && savedUser) {
      setIsLoggedIn(true);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const deleteReport = async (id: string) => {
    try {
      const resp = await fetch(`${API_BASE}/api/history/${id}`, {
        method: 'DELETE'
      });
      if (!resp.ok) return;
      setHistoryReports(prev => prev.filter(report => report.id !== id));
    } catch (err) {
      console.error('Delete history failed:', err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regData.password.length < 8 || regData.password.length > 16) {
      setRegError('密码长度必须在 8 到 16 位之间');
      return;
    }

    if (regData.password !== regData.confirmPassword) {
      setRegError('两次输入的密码不一致');
      return;
    }

    const username = regData.username.trim();
    if (!username) {
      setRegError('请输入用户名');
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password: regData.password
        })
      });
      let data: { error?: string; detail?: string } = {};
      try {
        data = await resp.json();
      } catch {
        setRegError(resp.ok ? '注册失败，请重试' : '服务器响应异常，请稍后重试');
        return;
      }
      if (!resp.ok) {
        const msg = data.detail ? `${data.error}（${data.detail}）` : (data.error || '注册失败');
        setRegError(msg);
        return;
      }
      alert('注册成功！请登录');
      setAuthView('login');
      setRegData({ username: '', password: '', confirmPassword: '' });
    } catch (err) {
      console.error('Register failed:', err);
      setRegError('无法连接服务器，请检查网络或稍后重试');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginData.password.length < 8 || loginData.password.length > 16) {
      setLoginError('密码长度必须在 8 到 16 位之间');
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || '登录失败');
        return;
      }

      setIsLoggedIn(true);
      setUser(data.user);
      localStorage.setItem('safety_guardian_auth', 'true');
      localStorage.setItem('safety_guardian_user', JSON.stringify(data.user));
    } catch (err) {
      console.error('Login failed:', err);
      setLoginError('登录失败，请稍后重试');
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sending reset link
    setForgotPasswordStatus('success');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setStats({ detectionCount: 0, studentsHelped: 0, todayQaCount: 0 });
    setHistoryReports([]);
    localStorage.removeItem('safety_guardian_auth');
    localStorage.removeItem('safety_guardian_user');
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const resp = await fetch(`${API_BASE}/api/history?userId=${user.id}`);
      const data = await resp.json();
      if (resp.ok) setHistoryReports(data.reports || []);
    } catch (err) {
      console.error('Fetch history failed:', err);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      const resp = await fetch(`${API_BASE}/api/detect/stats?userId=${user.id}`);
      const data = await resp.json();
      if (resp.ok && data.detectionCount !== undefined) {
        setStats({
          detectionCount: data.detectionCount ?? 0,
          studentsHelped: data.studentsHelped ?? 0,
          todayQaCount: data.todayQaCount ?? 0
        });
      }
    } catch (err) {
      console.error('Fetch stats failed:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchHistory();
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (showHistory && user) fetchHistory();
  }, [showHistory]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleVoiceAnalysis(audioBlob);
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请检查权限设置。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceAnalysis = async (audioBlob: Blob) => {
    if (!user) {
      alert('请先登录');
      return;
    }
    setIsDetecting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const resp = await fetch(`${API_BASE}/api/detect/voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              audioBase64: base64Data
            })
          });
          const data = await resp.json();
          if (!resp.ok) {
            console.error(data.error, data.detail);
            const suggestion = data.detail
              ? `语音分析失败。（${data.detail}）`
              : '语音分析失败，请重试。';
            setResult({ riskLevel: '低风险', suggestion });
          } else {
            setResult(data.result);
            if (data.stats) setStats(data.stats);
            fetchHistory();
          }
        } catch (err) {
          console.error('Voice detect failed:', err);
          const msg = err instanceof Error ? err.message : '网络或请求异常';
          setResult({
            riskLevel: '低风险',
            suggestion: `语音分析失败。（${msg}）`
          });
        } finally {
          setIsDetecting(false);
        }
      };
    } catch (error) {
      console.error("Voice analysis failed:", error);
      const msg = error instanceof Error ? error.message : '未知错误';
      setResult({
        riskLevel: '低风险',
        suggestion: `语音分析失败。（${msg}）`
      });
      setIsDetecting(false);
    }
  };

  const handleDetect = async () => {
    if (!inputText.trim()) return;
    if (!user) {
      alert('请先登录');
      return;
    }
    
    setIsDetecting(true);
    try {
      const resp = await fetch(`${API_BASE}/api/detect/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          text: inputText
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error(data.error, data.detail);
        const suggestion = data.detail
          ? `检测服务暂时不可用。（${data.detail}）`
          : '检测服务暂时不可用，请稍后再试。';
        setResult({ riskLevel: '低风险', suggestion });
      } else {
        setResult(data.result);
        if (data.stats) setStats(data.stats);
        fetchHistory();
      }
    } catch (error) {
      console.error("Detection failed:", error);
      const msg = error instanceof Error ? error.message : '网络或请求异常';
      setResult({
        riskLevel: '低风险',
        suggestion: `检测服务暂时不可用。（${msg}）`
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleExport = () => {
    const reportContent = `
AI校园安全小卫士 - 检测报告
---------------------------
检测时间: ${new Date().toLocaleString()}
检测内容: 
${inputText || "（未输入文字，使用默认示例）"}

检测结果: ${result?.riskLevel || '低风险'}
AI建议:
${result?.suggestion || "这段文字包含了一些轻微的调侃，在日常交流中要注意对方的感受。建议保持友好的沟通方式，避免使用可能产生误解的词汇。如果感到不适，可以尝试通过正向沟通解决。"}

---------------------------
本报告由AI生成，仅供参考。
    `.trim();

    try {
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `安全检测报告_${new Date().getTime()}.txt`);
      
      // Ensure the link is in the document for some browsers
      link.style.display = 'none';
      document.body.appendChild(link);
      
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("Export failed:", err);
      // Fallback for extremely restrictive environments
      const encodedUri = encodeURI("data:text/plain;charset=utf-8," + reportContent);
      window.open(encodedUri);
    }
  };

  const faqs = [
    {
      question: "什么是校园欺凌？",
      answer: "校园欺凌是指发生在校园内外、学生之间，一方恶意通过肢体、语言及网络等手段实施欺压、侮辱，造成另一方身体伤害、财产损失或精神损害的行为。"
    },
    {
      question: "遇到欺凌应该怎么办？",
      answer: "保持冷静，及时大声呼救或寻求周围老师、同学的帮助。事后一定要告诉家长和老师，切勿沉默。你可以使用本平台的匿名反馈功能寻求帮助。"
    }
  ];

  const quizQuestions = [
    {
      title: '校园安全知识竞赛（单选题）',
      question: '在校园内遇到可疑陌生人反复搭话并试图带你离开时，最安全的做法是？',
      options: [
        '礼貌拒绝后独自快速离开到偏僻区域',
        '先稳住对方，立刻前往人多有监控区域并联系老师/家长',
        '跟随对方离开，之后再判断是否安全',
        '拍照发朋友圈提醒同学后继续原地停留'
      ],
      correctIndex: 1,
      explanation: '正确做法是优先保证人身安全，迅速前往人多且有安保的区域，并第一时间联系老师、家长或警方求助。'
    },
    {
      title: '校园安全知识竞赛（单选题）',
      question: '如果你在群聊中看到同学被持续辱骂，第一步更合适的是？',
      options: [
        '转发截图给更多同学围观',
        '跟着起哄，避免自己被针对',
        '先截图留证并私下安抚同学，同时向老师报告',
        '直接退出群聊，不再关注'
      ],
      correctIndex: 2,
      explanation: '遇到网络欺凌应先留证并及时求助老师，避免扩散和二次伤害。'
    },
    {
      title: '校园安全知识竞赛（单选题）',
      question: '当你发现同学情绪低落并提到“活着没意义”时，更恰当的做法是？',
      options: [
        '认为只是玩笑，不需要处理',
        '私下安慰后不告诉任何人',
        '鼓励其尽快联系心理老师，并及时告知班主任和家长',
        '公开在班里讨论其情况'
      ],
      correctIndex: 2,
      explanation: '涉及自伤暗示时要高度重视，及时联动老师和家长进行专业干预。'
    },
    {
      title: '校园安全知识竞赛（单选题）',
      question: '放学路上发现有人长期跟踪你，以下哪项更安全？',
      options: [
        '直接回家，不告诉任何人',
        '走人少小路甩开对方',
        '进入便利店等公共场所并联系家长或报警',
        '停下来与对方争吵'
      ],
      correctIndex: 2,
      explanation: '应优先进入人多且有监控的公共区域，并及时联系可信任成年人或警方。'
    },
    {
      title: '校园安全知识竞赛（单选题）',
      question: '看到同学在厕所被围堵威胁，你首先应该？',
      options: [
        '拍视频发到群里',
        '立即通知老师或安保并记录时间地点',
        '自己冲进去单独对抗多人',
        '当作没看见离开'
      ],
      correctIndex: 1,
      explanation: '遇到多人冲突，优先通知老师和安保，避免个人冒险导致事态扩大。'
    },
    {
      title: '校园安全知识竞赛（单选题）',
      question: '收到“点击链接领取奖学金”的陌生短信，正确做法是？',
      options: [
        '立即点击，先领再说',
        '转发给同学一起试',
        '不点击链接，向老师核实并删除',
        '输入账号密码验证身份'
      ],
      correctIndex: 2,
      explanation: '可疑链接常见于诈骗，应先核实来源，绝不随意输入账号密码。'
    },
    {
      title: '校园安全知识竞赛（单选题）',
      question: '发现室友情绪异常并频繁提及轻生，最合适的是？',
      options: [
        '承诺保密，不告诉任何人',
        '开玩笑缓解气氛即可',
        '尽快联系辅导员/心理老师并陪同求助',
        '在朋友圈公开提醒大家关注他'
      ],
      correctIndex: 2,
      explanation: '对自伤风险必须及时上报并寻求专业帮助，陪同求助很关键。'
    },
    {
      title: '校园安全知识竞赛（单选题）',
      question: '在实验室发生小型火情时，哪项做法正确？',
      options: [
        '先拍照记录再处理',
        '按应急预案断电并使用就近灭火器，同时报告老师',
        '端水泼向所有火源',
        '锁门防止他人进入'
      ],
      correctIndex: 1,
      explanation: '实验室火情应按预案处置，优先断电、灭火并及时上报，避免盲目操作。'
    },
    {
      title: '校园安全知识竞赛（单选题）',
      question: '你在网上被匿名账号持续辱骂，最优先处理步骤是？',
      options: [
        '立即回骂并曝光对方',
        '截图取证、平台举报并拉黑，必要时寻求学校和警方帮助',
        '删除账号彻底退出网络',
        '发动同学“反击”'
      ],
      correctIndex: 1,
      explanation: '网络侵害要先取证和举报，避免情绪化对抗，并及时寻求正规渠道帮助。'
    }
  ] as const;
  const quizQuestion = quizQuestions[quizIndex];

  const getRandomQuizIndex = (excludeIndex?: number): number => {
    if (quizQuestions.length <= 1) return 0;
    let next = Math.floor(Math.random() * quizQuestions.length);
    if (excludeIndex === undefined) return next;
    while (next === excludeIndex) {
      next = Math.floor(Math.random() * quizQuestions.length);
    }
    return next;
  };

  const openQuizPanel = () => {
    setShowQuiz(true);
    setQuizIndex(getRandomQuizIndex());
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setQuizWrongCountdown(0);
  };

  const gotoNextQuizQuestion = () => {
    setQuizIndex((prev) => getRandomQuizIndex(prev));
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setQuizWrongCountdown(0);
  };

  useEffect(() => {
    const isWrong =
      quizSubmitted &&
      selectedQuizOption !== null &&
      selectedQuizOption !== quizQuestion.correctIndex;
    if (!isWrong) {
      setQuizWrongCountdown(0);
      return;
    }

    setQuizWrongCountdown(3);
    const timer = setInterval(() => {
      setQuizWrongCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizSubmitted, selectedQuizOption, quizQuestion.correctIndex, quizIndex]);

  const handleKnowledgeAsk = async () => {
    const text = (knowledgeQuestion.trim() || lastKnowledgeQuestion.trim());
    if (!text) return;
    if (!user) {
      setKnowledgeError('请先登录后再使用知识问答。');
      return;
    }
    setKnowledgeLoading(true);
    setKnowledgeError('');
    setLastKnowledgeQuestion(text);
    try {
      const resp = await fetch(`${API_BASE}/api/detect/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, question: text })
      });
      const data = await resp.json();
      if (!resp.ok) {
        const msg = data.detail ? `${data.error || '问答失败'}（${data.detail}）` : (data.error || '问答失败');
        setKnowledgeError(msg);
        return;
      }
      const answer = data?.result?.answer || '知识问答服务暂时不可用，请稍后重试。';
      const riskLevel = (data?.result?.riskLevel || '低风险') as '低风险' | '中风险' | '高风险';
      setKnowledgeAnswer(answer);
      setRecentKnowledgeSessions((prev) => [
        { question: text, answer, riskLevel },
        ...prev
      ].slice(0, 3));
      if (data.stats) {
        setStats({
          detectionCount: data.stats.detectionCount ?? 0,
          studentsHelped: data.stats.studentsHelped ?? 0,
          todayQaCount: data.stats.todayQaCount ?? 0
        });
      }
      fetchHistory();
    } catch (err) {
      console.error('Knowledge ask failed:', err);
      setKnowledgeError('问答请求失败，请检查网络后重试。');
    } finally {
      setKnowledgeLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-5 pointer-events-none">
          <Shield className="absolute top-10 left-10 w-[120px] h-[120px] text-primary" />
          <School className="absolute bottom-20 right-10 w-[100px] h-[100px] text-primary" />
          <Shield className="absolute top-1/2 left-20 w-[80px] h-[80px] text-primary" />
        </div>

        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {authView === 'login' ? (
              <motion.div 
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
              >
                {/* Header Section */}
                <div className="pt-10 pb-6 px-8 flex flex-col items-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Shield className="text-primary w-12 h-12" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">AI校园安全小卫士</h1>
                  <p className="text-slate-500 text-sm mt-2">守护校园安全，智慧伴你同行</p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleLogin} className="p-8 space-y-5">
                  {loginError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 text-red-500 text-xs p-3 rounded-lg border border-red-100 flex items-center gap-2"
                    >
                      <AlertTriangle size={14} />
                      {loginError}
                    </motion.div>
                  )}

                  {/* Username Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1">用户名 / 学工号</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                      </div>
                      <input 
                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-primary transition-all text-slate-900 placeholder:text-slate-400 outline-none" 
                        placeholder="请输入您的账号" 
                        type="text"
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1">密码</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                      </div>
                      <input 
                        className="block w-full pl-11 pr-12 py-3 bg-slate-50 border-none rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-primary transition-all text-slate-900 placeholder:text-slate-400 outline-none" 
                        placeholder="请输入您的密码" 
                        type={showPassword ? "text" : "password"}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600" 
                        type="button"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Utilities */}
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center cursor-pointer group">
                      <input className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300" type="checkbox" />
                      <span className="ml-2 text-sm text-slate-500 group-hover:text-slate-700 transition-colors">记住我</span>
                    </label>
                    <button 
                      type="button"
                      onClick={() => setAuthView('forgot-password')}
                      className="text-sm font-medium text-primary hover:underline underline-offset-4"
                    >
                      忘记密码？
                    </button>
                  </div>

                  {/* Login Button */}
                  <button 
                    className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2" 
                    type="submit"
                  >
                    <span>登录</span>
                    <LogIn size={18} />
                  </button>

                  {/* Registration Link */}
                  <div className="pt-4 text-center">
                    <p className="text-sm text-slate-500">
                      还没有账号？
                      <button 
                        type="button"
                        onClick={() => setAuthView('register')}
                        className="text-primary font-bold hover:underline underline-offset-4 ml-1"
                      >
                        立即注册
                      </button>
                    </p>
                  </div>
                </form>

                {/* Bottom Mascot Decorative */}
                <div className="px-8 pb-8 flex justify-center">
                  <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                    <Smile className="text-primary w-4 h-4" />
                    <span className="text-xs font-medium text-primary">小卫士提醒：请妥善保管您的账号安全</span>
                  </div>
                </div>
              </motion.div>
            ) : authView === 'register' ? (
              <motion.div 
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative"
              >
                {/* Back Button */}
                <button 
                  onClick={() => setAuthView('login')}
                  className="absolute top-6 left-6 p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                  title="返回登录"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Header Section */}
                <div className="pt-10 pb-6 px-8 flex flex-col items-center border-b border-slate-50">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Shield className="text-primary w-12 h-12" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">账号注册</h1>
                  <p className="text-slate-500 text-sm mt-1">加入我们，共同守护校园安全</p>
                </div>

                {/* Registration Form */}
                <form 
                  onSubmit={handleRegister} 
                  className="p-8 space-y-5"
                >
                  {regError && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {regError}
                    </motion.div>
                  )}
                  {/* Username */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 ml-1">用户名 / 工号</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                      </div>
                      <input 
                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-primary transition-all text-slate-900 placeholder:text-slate-400 outline-none" 
                        placeholder="请输入您的用户名或工号" 
                        type="text"
                        value={regData.username}
                        onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 ml-1">设置密码</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                      </div>
                      <input 
                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-primary transition-all text-slate-900 placeholder:text-slate-400 outline-none" 
                        placeholder="请输入登录密码" 
                        type="password"
                        value={regData.password}
                        onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 ml-1">确认密码</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                      </div>
                      <input 
                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-primary transition-all text-slate-900 placeholder:text-slate-400 outline-none" 
                        placeholder="请再次确认您的密码" 
                        type="password"
                        value={regData.confirmPassword}
                        onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Agreement */}
                  <div className="flex items-start gap-2 pt-2 px-1">
                    <input className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary border-slate-300" id="agreement" type="checkbox" required />
                    <label className="text-xs text-slate-500 leading-relaxed" htmlFor="agreement">
                      我已阅读并同意 <a className="text-primary hover:underline" href="#">《服务协议》</a> 和 <a className="text-primary hover:underline" href="#">《隐私政策》</a>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button 
                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98] mt-4" 
                    type="submit"
                  >
                    立即注册
                  </button>

                  {/* Footer Link */}
                  <div className="pt-4 text-center">
                    <p className="text-sm text-slate-500">
                      已有账号？ 
                      <button 
                        type="button"
                        onClick={() => setAuthView('login')}
                        className="text-primary font-bold hover:underline ml-1"
                      >
                        立即登录
                      </button>
                    </p>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key="forgot-password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative"
              >
                {/* Back Button */}
                <button 
                  onClick={() => {
                    setAuthView('login');
                    setForgotPasswordStatus('idle');
                  }}
                  className="absolute top-6 left-6 p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                  title="返回登录"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Header Section */}
                <div className="pt-10 pb-6 px-8 flex flex-col items-center border-b border-slate-50">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Lock className="text-primary w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">找回密码</h2>
                  <p className="text-slate-500 text-sm mt-2">输入您的注册邮箱或用户名</p>
                </div>

                {/* Form Section */}
                <div className="p-8">
                  {forgotPasswordStatus === 'success' ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-4 py-4"
                    >
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <Send size={32} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-800">重置链接已发送</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          我们已向您的预留联系方式发送了重置链接，请注意查收。
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setAuthView('login');
                          setForgotPasswordStatus('idle');
                        }}
                        className="w-full py-3 text-primary font-bold hover:bg-primary/5 rounded-xl transition-all"
                      >
                        返回登录
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">用户名 / 邮箱</label>
                        <input 
                          className="block w-full px-4 py-3 bg-slate-50 border-none rounded-xl ring-1 ring-slate-200 focus:ring-2 focus:ring-primary transition-all text-slate-900 placeholder:text-slate-400 outline-none" 
                          placeholder="请输入您的账号信息" 
                          type="text"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          required
                        />
                      </div>

                      <button 
                        className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98]" 
                        type="submit"
                      >
                        发送重置链接
                      </button>

                      <div className="text-center">
                        <button 
                          type="button"
                          onClick={() => setAuthView('login')}
                          className="text-sm text-slate-500 hover:text-primary transition-colors"
                        >
                          想起密码了？立即登录
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Info */}
          <footer className="mt-8 text-center text-slate-400 text-xs">
            <p>© 2024 AI校园安全小卫士 · 技术支持：智慧校园安全中心</p>
            <div className="mt-2 flex justify-center gap-4">
              <a className="hover:text-primary transition-colors" href="#">服务协议</a>
              <a className="hover:text-primary transition-colors" href="#">隐私政策</a>
              <a className="hover:text-primary transition-colors" href="#">联系我们</a>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Shield className="text-primary w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-primary tracking-tight">AI校园安全小卫士</h1>
              <p className="text-secondary text-lg font-medium mt-1">守护校园，快乐成长</p>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm font-semibold">
            <button 
              onClick={() => setShowHistory(true)}
              className="text-slate-600 hover:text-primary transition-colors flex items-center gap-2"
            >
              <History size={18} />
              历史报告
            </button>
            <button
              onClick={openQuizPanel}
              className="text-slate-600 hover:text-primary transition-colors flex items-center gap-2"
            >
              <GraduationCap size={18} />
              知识竞赛
            </button>
            <button 
              onClick={handleLogout}
              className="bg-primary text-white px-6 py-2 rounded-full hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <User size={18} />
              退出登录
            </button>
          </nav>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Left Column: Detection Tool */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                文本内容检测
              </h3>
              <div className="relative">
                <textarea 
                  className="w-full h-[150px] p-4 rounded-lg border-2 border-slate-100 bg-slate-50 focus:border-primary focus:ring-0 transition-all text-base placeholder:text-slate-400 resize-none outline-none"
                  placeholder="输入要检测的文字..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, 500))}
                />
                <div className="absolute bottom-4 right-4 text-xs text-slate-400">
                  {inputText.length} / 500
                </div>
              </div>
              <button 
                onClick={handleDetect}
                className={`mt-4 w-full md:w-auto bg-primary text-white font-bold py-3 px-10 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-md ${isDetecting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isDetecting ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Activity size={20} />
                  </motion.div>
                ) : (
                  <Activity size={20} />
                )}
                {isDetecting ? '检测中...' : '开始检测'}
              </button>
            </motion.div>

            {/* Results Area */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[200px] flex-1 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">检测结果</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-1 bg-[#e1f5f7] text-[#17a2b8] hover:bg-[#17a2b8] hover:text-white transition-all rounded-lg text-sm font-bold border border-[#17a2b8]/20"
                  >
                    <Download size={14} />
                    导出报告
                  </button>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold ${
                    (result?.riskLevel || '低风险') === '高风险' ? 'bg-danger/10 text-danger' : 
                    (result?.riskLevel || '低风险') === '中风险' ? 'bg-orange-100 text-orange-700' : 
                    'bg-[#fff9e6] text-[#d4a017]'
                  }`}>
                    <AlertTriangle size={14} />
                    {result?.riskLevel || '低风险'}
                  </div>
                </div>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={result ? "result" : "default"}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={`p-6 bg-[#f0f9fa] rounded-lg border-l-[6px] border-[#17a2b8] flex-1`}
                >
                  <p className="text-[16px] leading-relaxed text-slate-700">
                    <span className="font-bold block mb-2 italic text-[#17a2b8]">AI 小卫士建议：</span>
                    {result?.suggestion || "待生成AI报告..."}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right Column: Tools & Features */}
          <div className="lg:col-span-4 space-y-6">
            {/* Voice Detection */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center"
            >
              <h3 className="text-lg font-bold mb-6">语音实时监测</h3>
              <div className="relative inline-block">
                <AnimatePresence>
                  {isRecording && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0.2 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 bg-secondary rounded-full"
                    />
                  )}
                </AnimatePresence>
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 w-20 h-20 rounded-full shadow-lg flex items-center justify-center transition-all ${
                    isRecording ? 'bg-danger text-white scale-110' : 'bg-secondary text-white hover:scale-105'
                  }`}
                >
                  {isRecording ? <MicOff size={36} /> : <Mic size={36} />}
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                {isRecording ? '正在录音中（点击停止并分析）...' : '点击麦克风开始录音检测'}
              </p>
            </motion.div>

            {/* Safety Class (Q&A) */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <GraduationCap className="text-secondary" size={20} />
                安全小课堂
              </h3>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 mb-4">
                <p className="text-xs text-slate-500 mb-2">安全知识问答</p>
                <textarea
                  className="w-full h-24 p-3 rounded-lg border border-slate-200 bg-white focus:border-primary outline-none text-sm resize-none"
                  placeholder="输入你的问题，例如：遇到校园欺凌该怎么处理？"
                  value={knowledgeQuestion}
                  onChange={(e) => setKnowledgeQuestion(e.target.value.slice(0, 200))}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {['如何应对校园欺凌？', '被陌生人尾随怎么办？', '网络暴力如何处理？'].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setKnowledgeQuestion(item);
                      }}
                      className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-all"
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleKnowledgeAsk}
                  disabled={knowledgeLoading}
                  className={`mt-3 w-full py-2.5 rounded-lg bg-primary text-white font-bold hover:brightness-110 transition-all ${
                    knowledgeLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {knowledgeLoading ? '生成建议中...' : '获取建议'}
                </button>
                {knowledgeError && (
                  <div className="mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {knowledgeError}
                  </div>
                )}
                {knowledgeError && (
                  <button
                    onClick={handleKnowledgeAsk}
                    className="mt-2 w-full py-2 rounded-lg border border-primary/30 text-primary font-medium hover:bg-primary/5 transition-all"
                  >
                    重试上次问答
                  </button>
                )}
                <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 leading-relaxed">
                  <span className="text-secondary font-bold block mb-1">知识助手回答</span>
                  {knowledgeAnswer}
                </div>
                {recentKnowledgeSessions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2">最近 3 条问答</p>
                    <div className="space-y-2">
                      {recentKnowledgeSessions.map((session, idx) => (
                        <div key={`${session.question}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-2.5">
                          <p className="text-xs text-slate-600 mb-1">Q: {session.question}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">A: {session.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div key={index} className="border border-slate-100 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex justify-between items-center p-3 cursor-pointer bg-slate-50 font-medium text-left"
                    >
                      {faq.question}
                      {openFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <AnimatePresence>
                      {openFaq === index && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 text-sm text-slate-600 border-t border-slate-100">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Stats Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 grid grid-cols-3 gap-4 items-center"
            >
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">今日检测次数</p>
                <motion.p 
                  key={stats.detectionCount}
                  initial={{ scale: 1.2, color: '#28a745' }}
                  animate={{ scale: 1, color: '#28a745' }}
                  className="text-2xl font-black"
                >
                  {stats.detectionCount}
                </motion.p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">帮助同学数</p>
                <motion.p 
                  key={stats.studentsHelped}
                  initial={{ scale: 1.2, color: '#17a2b8' }}
                  animate={{ scale: 1, color: '#17a2b8' }}
                  className="text-2xl font-black"
                >
                  {stats.studentsHelped}
                </motion.p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">今日问题回答数</p>
                <motion.p
                  key={stats.todayQaCount}
                  initial={{ scale: 1.2, color: '#d4a017' }}
                  animate={{ scale: 1, color: '#d4a017' }}
                  className="text-2xl font-black"
                >
                  {stats.todayQaCount}
                </motion.p>
              </div>
            </motion.div>

          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Info size={14} className="text-slate-400" />
                <span>1. 我们的AI仅作参考，如有紧急情况请立即报警。</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Info size={14} className="text-slate-400" />
                <span>2. 支持文本、语音多种输入方式。</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Info size={14} className="text-slate-400" />
                <span>3. 保护隐私是我们的首要任务。</span>
              </div>
            </div>
            <div className="text-slate-400 text-xs font-medium">
              © 2026 AI校园安全小卫士 · 智慧守护每一天
            </div>
          </div>
        </footer>
      </div>

      {/* History Overlay */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <History className="text-primary" size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">历史检测报告</h2>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <ChevronDown size={24} className="rotate-90" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="px-6 py-3 border-b border-slate-50 flex gap-2 overflow-x-auto">
                {(['全部', '低风险', '中风险', '高风险'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                      historyFilter === filter
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="px-6 py-3 border-b border-slate-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={historyKeyword}
                    onChange={(e) => setHistoryKeyword(e.target.value)}
                    placeholder="按关键词搜索历史（内容/建议）"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {historyReports.filter(r => {
                  const byRisk = historyFilter === '全部' || r.result.riskLevel === historyFilter;
                  const keyword = historyKeyword.trim().toLowerCase();
                  const byKeyword = !keyword
                    || r.content.toLowerCase().includes(keyword)
                    || r.result.suggestion.toLowerCase().includes(keyword);
                  return byRisk && byKeyword;
                }).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-400">
                      {historyFilter === '全部' ? '暂无历史报告' : `暂无${historyFilter}报告`}
                    </p>
                  </div>
                ) : (
                  historyReports
                    .filter(r => {
                      const byRisk = historyFilter === '全部' || r.result.riskLevel === historyFilter;
                      const keyword = historyKeyword.trim().toLowerCase();
                      const byKeyword = !keyword
                        || r.content.toLowerCase().includes(keyword)
                        || r.result.suggestion.toLowerCase().includes(keyword);
                      return byRisk && byKeyword;
                    })
                    .map(report => (
                      <div 
                        key={report.id}
                        className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-primary/30 transition-all group"
                      >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            report.type === '文本'
                              ? 'bg-blue-100 text-blue-600'
                              : report.type === '语音'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {report.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            report.result.riskLevel === '高风险' ? 'bg-red-100 text-red-600' :
                            report.result.riskLevel === '中风险' ? 'bg-orange-100 text-orange-600' :
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            {report.result.riskLevel}
                          </span>
                          <span className="text-xs text-slate-400">{report.timestamp}</span>
                        </div>
                        <button 
                          onClick={() => deleteReport(report.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2 mb-2 italic">
                        "{report.content}"
                      </p>
                      <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-100">
                        <span className="font-bold text-primary">建议：</span>
                        {report.result.suggestion}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Overlay */}
      <AnimatePresence>
        {showQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <GraduationCap className="text-primary" size={22} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{quizQuestion.title}</h2>
                </div>
                <button
                  onClick={() => setShowQuiz(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <ChevronDown size={24} className="rotate-90" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-base font-semibold text-slate-800 mb-4">{quizQuestion.question}</p>
                <div className="space-y-3">
                  {quizQuestion.options.map((option, index) => {
                    const isSelected = selectedQuizOption === index;
                    const isCorrect = index === quizQuestion.correctIndex;
                    const showResultStyle = quizSubmitted;
                    const optionClass = showResultStyle
                      ? isCorrect
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : isSelected
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-white text-slate-600'
                      : isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40';

                    return (
                      <button
                        key={option}
                        onClick={() => !quizSubmitted && setSelectedQuizOption(index)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${optionClass}`}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={selectedQuizOption === null || quizSubmitted}
                    className={`px-5 py-2.5 rounded-lg font-bold text-white transition-all ${
                      selectedQuizOption === null || quizSubmitted
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-primary hover:brightness-110'
                    }`}
                  >
                    提交答案
                  </button>
                  {quizSubmitted &&
                    (selectedQuizOption === quizQuestion.correctIndex || quizWrongCountdown === 0) && (
                    <button
                      onClick={gotoNextQuizQuestion}
                      className="px-5 py-2.5 rounded-lg font-bold border border-primary/30 text-primary hover:bg-primary/5 transition-all"
                    >
                      下一题
                    </button>
                  )}
                </div>
                {quizSubmitted &&
                  selectedQuizOption !== null &&
                  selectedQuizOption !== quizQuestion.correctIndex &&
                  quizWrongCountdown > 0 && (
                    <p className="mt-2 text-sm text-slate-500">
                      回答错误，{quizWrongCountdown} 秒后可进入下一题
                    </p>
                  )}

                {quizSubmitted && (
                  <div className="mt-5 rounded-xl p-4 border border-slate-200 bg-slate-50">
                    <p className={`font-bold ${selectedQuizOption === quizQuestion.correctIndex ? 'text-emerald-600' : 'text-red-600'}`}>
                      {selectedQuizOption === quizQuestion.correctIndex ? '回答正确，安全意识很棒！' : '回答不正确，再复习一下要点吧。'}
                    </p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{quizQuestion.explanation}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
